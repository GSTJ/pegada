import type { Topic, TopicPayloads } from "./topics";

import { sendError } from "../errors/errors";
import { config } from "../shared/config";
import { TOPICS } from "./topics";

type EnqueueOptions = {
  delaySeconds?: number;
  idempotencyKey?: string;
  /**
   * Run the handler in-process if the queue hop is still failing after
   * {@link ENQUEUE_MAX_ATTEMPTS}. Opt-in per call, because it is only the
   * right trade for jobs that are cheap, fast, and worth more to the user
   * than the request latency they cost — `mail` during login is the case it
   * exists for. Never set it on `process-image` (sharp plus a moderation call
   * out to a model, 120s budget) or on anything that relies on `delaySeconds`.
   */
  fallbackInline?: boolean;
};

// Handlers are imported lazily so heavyweight consumers (sharp, the AI SDK)
// stay out of the module graph of regular API routes.
const INLINE_HANDLERS: {
  [T in Topic]: () => Promise<(payload: TopicPayloads[T]) => Promise<unknown>>;
} = {
  [TOPICS.MAIL]: () => import("./handlers/mail").then((m) => m.handleMail),
  [TOPICS.PROCESS_IMAGE]: () =>
    import("./handlers/process-image").then((m) => m.handleProcessImage),
  [TOPICS.SEND_PUSH]: () =>
    import("./handlers/push").then((m) => m.handleSendPushNotification),
  [TOPICS.CHECK_PUSH_RECEIPTS]: () =>
    import("./handlers/push").then((m) => m.handleCheckPushReceipts),
  [TOPICS.CLEANUP_UPLOAD]: () =>
    import("./handlers/upload").then((m) => m.handleCleanupUpload),
};

const isVercelQueueAvailable = () =>
  config.QUEUE_DRIVER === "vercel" ||
  (config.QUEUE_DRIVER !== "inline" && config.VERCEL === "1");

/**
 * How long one publish attempt may run before it is abandoned.
 *
 * `@vercel/queue`'s `send()` mints an OIDC token and then POSTs to the queue
 * service with a bare `fetch` — neither hop carries a timeout, so a stalled
 * connection holds the whole API request open until the platform kills the
 * function. On a cold invocation both hops are also at their slowest, which
 * is exactly when this matters.
 */
export const ENQUEUE_ATTEMPT_TIMEOUT_MS = 3_000;

/** Total attempts per publish — the first one plus its retries. */
export const ENQUEUE_MAX_ATTEMPTS = 3;

/** First backoff step. Doubles per attempt, with jitter. */
export const ENQUEUE_BASE_RETRY_DELAY_MS = 100;

const sleep = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

class EnqueueTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`Queue publish timed out after ${timeoutMs}ms`);
    this.name = "EnqueueTimeoutError";
  }
}

const withTimeout = async <T>(
  operation: () => Promise<T>,
  timeoutMs: number,
): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      operation(),
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(
          () => reject(new EnqueueTimeoutError(timeoutMs)),
          timeoutMs,
        );
      }),
    ]);
  } finally {
    // `Promise.race` does not cancel the loser. Clearing the timer is what
    // keeps a won race from holding the event loop open for the remainder of
    // the timeout — the difference between a 200ms request and a 3s one.
    if (timer) clearTimeout(timer);
  }
};

/**
 * Run `publish` until it settles or the attempts run out, bounding each
 * attempt and backing off with jitter between them. The jitter matters on a
 * cold deployment: without it, every request that woke up together retries in
 * lockstep and hits the recovering service as one spike.
 *
 * Exported for the tests, which need to drive the timing without waiting out
 * the production constants.
 */
export const publishWithRetry = async <T>(
  publish: () => Promise<T>,
  {
    attempts = ENQUEUE_MAX_ATTEMPTS,
    timeoutMs = ENQUEUE_ATTEMPT_TIMEOUT_MS,
    baseDelayMs = ENQUEUE_BASE_RETRY_DELAY_MS,
  }: { attempts?: number; timeoutMs?: number; baseDelayMs?: number } = {},
): Promise<T> => {
  let lastError: unknown;

  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      // oxlint-disable-next-line no-await-in-loop -- Retries are sequential by definition; running them in parallel would be the same spike this backs off from.
      return await withTimeout(publish, timeoutMs);
    } catch (error) {
      lastError = error;

      const isLastAttempt = attempt === attempts - 1;
      if (isLastAttempt) break;

      const backoff = baseDelayMs * 2 ** attempt;
      // oxlint-disable-next-line no-await-in-loop -- This await IS the backoff.
      await sleep(backoff + Math.random() * backoff);
    }
  }

  throw lastError;
};

const runInline = async <T extends Topic>(
  topic: T,
  payload: TopicPayloads[T],
) => {
  const handler = await INLINE_HANDLERS[topic]();
  await handler(payload);
};

/**
 * Publish a job. On Vercel this goes through Vercel Queues (durable,
 * retried, consumed by the routes under apps/nextjs/src/app/api/queues).
 * Anywhere else — local dev, Maestro e2e, tests — the handler runs inline
 * so the stack needs no queue infrastructure at all.
 *
 * A failed publish is retried before it is allowed to fail the caller's
 * request; see {@link ENQUEUE_MAX_ATTEMPTS}.
 */
export const enqueue = async <T extends Topic>(
  topic: T,
  payload: TopicPayloads[T],
  options: EnqueueOptions = {},
) => {
  const { fallbackInline, ...sendOptions } = options;

  if (isVercelQueueAvailable()) {
    const { send } = await import("@vercel/queue");

    try {
      return await publishWithRetry(() => send(topic, payload, sendOptions));
    } catch (error) {
      if (!fallbackInline) throw error;

      // The queue is the durable path and it is down. Serving the user from
      // the request thread is strictly better than failing them, but the
      // outage still has to be visible — it is not otherwise observable from
      // the outside once the fallback succeeds.
      sendError(error, { topic, fallback: "inline" });
      return runInline(topic, payload);
    }
  }

  if (sendOptions.delaySeconds) {
    // Inline mode has no scheduler. The only delayed job is the push
    // receipt audit, which is a prod-observability concern — skip it
    // instead of blocking the request or recursing forever.
    // oxlint-disable-next-line no-console -- Operator-facing note that a delayed job was dropped by the inline driver.
    console.log(
      `[queue] inline driver: skipping delayed job on topic "${topic}"`,
    );
    return;
  }

  return runInline(topic, payload);
};
