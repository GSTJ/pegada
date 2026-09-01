import type { PrismaClient } from "@prisma/client";

import { sendError } from "../errors/errors";
import {
  authenticatedProcedure,
  createInnerTRPCContext,
  createTRPCRouter,
  publicProcedure,
} from "../trpc";
import { LAST_ACTIVE_THROTTLE_MS } from "./last-active";

/**
 * `User.lastActiveAt` is the column every retention and dormancy report reads,
 * and it is written from the middleware every authenticated request passes
 * through. Two things have to hold at once and they pull against each other:
 * the value has to be recorded, and recording it must not turn one row into
 * the hottest write in the API.
 *
 * So these drive the real tRPC middleware with a fake database rather than
 * calling the helper directly. What is being asserted is which requests
 * produce a write, and that is a property of the middleware chain.
 */
jest.mock("@pegada/database", () => ({ prisma: {} }));

jest.mock("../errors/errors", () => ({
  sendError: jest.fn(),
  logDebug: jest.fn(),
  errorDebug: jest.fn(),
}));

/** Ships ESM only, which this suite's CommonJS transform cannot load. */
jest.mock("superjson", () => ({
  __esModule: true,
  default: {
    serialize: (value: unknown) => value,
    deserialize: (value: unknown) => value,
  },
}));

const updateMany = jest.fn(async () => ({ count: 1 }));
const db = { user: { updateMany } } as unknown as PrismaClient;

const router = createTRPCRouter({
  authed: authenticatedProcedure.query(() => "pong"),
  open: publicProcedure.query(() => "pong"),
});

const callerFor = (userId?: string) =>
  router.createCaller({
    ...createInnerTRPCContext({
      session: userId ? { user: { id: userId } } : null,
    }),
    db,
  });

/**
 * The write is fire and forget, so the procedure resolves before it does.
 * A macrotask hop is enough for the `updateMany` promise and its `.catch`.
 */
const flushPendingWrite = () =>
  new Promise((resolve) => {
    setImmediate(resolve);
  });

const START = Date.parse("2026-09-01T12:00:00.000Z");

let clock = START;

beforeEach(() => {
  clock = START;
  jest.spyOn(Date, "now").mockImplementation(() => clock);
  updateMany.mockImplementation(async () => ({ count: 1 }));
});

afterEach(() => {
  jest.restoreAllMocks();
});

it("records activity on the first authenticated request for a user", async () => {
  await expect(callerFor("user-first-request").authed()).resolves.toBe("pong");
  await flushPendingWrite();

  // The row is only written when it is actually stale. Two instances can both
  // believe it needs a write; the database decides, and the loser writes
  // nothing rather than overwriting a fresher value.
  expect(updateMany).toHaveBeenCalledTimes(1);
  expect(updateMany).toHaveBeenCalledWith({
    where: {
      id: "user-first-request",
      OR: [
        { lastActiveAt: null },
        { lastActiveAt: { lt: new Date(START - LAST_ACTIVE_THROTTLE_MS) } },
      ],
    },
    data: { lastActiveAt: new Date(START) },
  });
});

it("does not write again for a second request inside the throttle window", async () => {
  const caller = callerFor("user-inside-window");

  await caller.authed();
  await flushPendingWrite();
  expect(updateMany).toHaveBeenCalledTimes(1);

  clock = START + LAST_ACTIVE_THROTTLE_MS - 1;

  await caller.authed();
  await flushPendingWrite();

  expect(updateMany).toHaveBeenCalledTimes(1);
});

it("writes again once the throttle window has passed", async () => {
  const caller = callerFor("user-past-window");

  await caller.authed();
  await flushPendingWrite();

  clock = START + LAST_ACTIVE_THROTTLE_MS;

  await caller.authed();
  await flushPendingWrite();

  expect(updateMany).toHaveBeenCalledTimes(2);
  expect(updateMany).toHaveBeenLastCalledWith(
    expect.objectContaining({ data: { lastActiveAt: new Date(clock) } }),
  );
});

it("records nothing for a request without a session", async () => {
  await expect(callerFor().authed()).rejects.toMatchObject({
    code: "UNAUTHORIZED",
  });
  await expect(callerFor().open()).resolves.toBe("pong");
  await flushPendingWrite();

  expect(updateMany).not.toHaveBeenCalled();
});

it("reports a failed write instead of failing the request", async () => {
  const failure = new Error("connection reset");
  updateMany.mockRejectedValueOnce(failure);

  await expect(callerFor("user-write-fails").authed()).resolves.toBe("pong");
  await flushPendingWrite();

  expect(sendError).toHaveBeenCalledWith(
    failure,
    expect.objectContaining({ userId: "user-write-fails" }),
  );
});
