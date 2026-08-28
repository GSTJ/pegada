/**
 * The defect: `enqueue` published to Vercel Queues through a single bare
 * `send()`. Under the hood @vercel/queue mints an OIDC token and POSTs to the
 * queue service with `fetch` — no timeout, no retry of its own, and every
 * non-2xx becomes a throw. So one transient blip on that hop threw straight
 * out of `AuthenticationService.sendVerification`, past the OTP-required
 * happy path, and reached the app as the generic "An error occurred while
 * logging in."
 *
 * Worse, the OTP row is written *before* the enqueue, so the code existed in
 * the database while no email was ever sent, and the mobile client has no
 * mutation retry — the user's only recovery was to tap Continue again.
 *
 * Two guarantees are asserted here: a publish that fails transiently is
 * retried, and a publish that hangs is abandoned instead of holding the
 * request open until the platform kills the function.
 */
import { TOPICS } from "./topics";

jest.mock("../shared/config", () => ({
  config: { QUEUE_DRIVER: "vercel", NODE_ENV: "test" },
  isMagicEmail: () => false,
}));

const send = jest.fn();
jest.mock("@vercel/queue", () => ({
  send: (...args: unknown[]) => send(...args),
}));

const sendError = jest.fn();
jest.mock("../errors/errors", () => ({
  sendError: (...args: unknown[]) => sendError(...args),
  logDebug: () => undefined,
  errorDebug: () => undefined,
}));

// `require` rather than a top-level import: the module reads `config` at load,
// and the mocks above have to be in place first.
const loadEnqueue = () => require("./enqueue") as typeof import("./enqueue");

const MAIL_PAYLOAD = { email: "a@b.com", code: "123456" };

describe("enqueue retries", () => {
  it("survives a single transient failure on the queue hop", async () => {
    const { enqueue } = loadEnqueue();

    send
      .mockRejectedValueOnce(new Error("fetch failed"))
      .mockResolvedValueOnce({ messageId: "1" });

    await expect(enqueue(TOPICS.MAIL, MAIL_PAYLOAD)).resolves.toBeDefined();
    expect(send).toHaveBeenCalledTimes(2);
  });

  it("gives up after the configured number of attempts", async () => {
    const { enqueue, ENQUEUE_MAX_ATTEMPTS } = loadEnqueue();

    send.mockRejectedValue(new Error("fetch failed"));

    await expect(enqueue(TOPICS.MAIL, MAIL_PAYLOAD)).rejects.toThrow(
      "fetch failed",
    );
    expect(send).toHaveBeenCalledTimes(ENQUEUE_MAX_ATTEMPTS);
  });

  it("does not retry a publish that succeeded", async () => {
    const { enqueue } = loadEnqueue();

    send.mockResolvedValue({ messageId: "1" });

    await enqueue(TOPICS.MAIL, MAIL_PAYLOAD);
    expect(send).toHaveBeenCalledTimes(1);
  });
});

describe("publishWithRetry", () => {
  it("abandons an attempt that never settles", async () => {
    const { publishWithRetry } = loadEnqueue();

    // A publish that hangs forever is the shape that actually hurts: the
    // function holds the request open until the platform kills it, and the
    // client — which has no timeout of its own — spins the whole time.
    const publish = jest.fn(
      () =>
        new Promise<never>(() => {
          /* never settles */
        }),
    );

    await expect(
      publishWithRetry(publish, {
        attempts: 2,
        timeoutMs: 20,
        baseDelayMs: 1,
      }),
    ).rejects.toThrow(/timed out/i);

    expect(publish).toHaveBeenCalledTimes(2);
  });

  it("returns the value of the first attempt that settles", async () => {
    const { publishWithRetry } = loadEnqueue();

    const publish = jest
      .fn<Promise<string>, []>()
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValueOnce("ok");

    await expect(
      publishWithRetry(publish, {
        attempts: 3,
        timeoutMs: 500,
        baseDelayMs: 1,
      }),
    ).resolves.toBe("ok");
  });

  it("ships a finite, positive timeout and more than one attempt", () => {
    const { ENQUEUE_ATTEMPT_TIMEOUT_MS, ENQUEUE_MAX_ATTEMPTS } = loadEnqueue();

    expect(ENQUEUE_ATTEMPT_TIMEOUT_MS).toBeGreaterThan(0);
    expect(Number.isFinite(ENQUEUE_ATTEMPT_TIMEOUT_MS)).toBe(true);
    expect(ENQUEUE_MAX_ATTEMPTS).toBeGreaterThan(1);
  });
});

describe("inline fallback", () => {
  it("is off by default, so a dead queue still surfaces as an error", async () => {
    const { enqueue } = loadEnqueue();

    send.mockRejectedValue(new Error("fetch failed"));

    await expect(enqueue(TOPICS.MAIL, MAIL_PAYLOAD)).rejects.toThrow();
  });

  it("runs the handler in-process when the caller opts in", async () => {
    const { enqueue } = loadEnqueue();

    send.mockRejectedValue(new Error("fetch failed"));

    const handler = jest.fn().mockResolvedValue(undefined);
    jest.doMock("./handlers/mail", () => ({ handleMail: handler }));

    await expect(
      enqueue(TOPICS.MAIL, MAIL_PAYLOAD, { fallbackInline: true }),
    ).resolves.toBeUndefined();

    expect(handler).toHaveBeenCalledWith(MAIL_PAYLOAD);
    // The queue outage still has to be visible even though the user was served.
    expect(sendError).toHaveBeenCalled();
  });
});
