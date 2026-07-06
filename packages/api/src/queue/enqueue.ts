import { Topic, TopicPayloads, TOPICS } from "./topics";

type EnqueueOptions = {
  delaySeconds?: number;
  idempotencyKey?: string;
};

// Handlers are imported lazily so heavyweight consumers (sharp, tfjs) stay
// out of the module graph of regular API routes.
const INLINE_HANDLERS: {
  [T in Topic]: () => Promise<(payload: TopicPayloads[T]) => Promise<unknown>>;
} = {
  [TOPICS.MAIL]: () => import("./handlers/mail").then((m) => m.handleMail),
  [TOPICS.PROCESS_IMAGE]: () => import("./handlers/processImage").then((m) => m.handleProcessImage),
  [TOPICS.SEND_PUSH]: () => import("./handlers/push").then((m) => m.handleSendPushNotification),
  [TOPICS.CHECK_PUSH_RECEIPTS]: () =>
    import("./handlers/push").then((m) => m.handleCheckPushReceipts),
};

const isVercelQueueAvailable = () =>
  process.env.QUEUE_DRIVER === "vercel" ||
  (process.env.QUEUE_DRIVER !== "inline" && process.env.VERCEL === "1");

/**
 * Publish a job. On Vercel this goes through Vercel Queues (durable,
 * retried, consumed by the routes under apps/nextjs/src/app/api/queues).
 * Anywhere else — local dev, Maestro e2e, tests — the handler runs inline
 * so the stack needs no queue infrastructure at all.
 */
export const enqueue = async <T extends Topic>(
  topic: T,
  payload: TopicPayloads[T],
  options: EnqueueOptions = {},
) => {
  if (isVercelQueueAvailable()) {
    // eslint-disable-next-line no-console
    console.log("[queue-debug] enqueue: pre-send", {
      topic,
      QUEUE_DRIVER: process.env.QUEUE_DRIVER ?? null,
      VERCEL: process.env.VERCEL ?? null,
      VERCEL_ENV: process.env.VERCEL_ENV ?? null,
      VERCEL_REGION: process.env.VERCEL_REGION ?? null,
      VERCEL_DEPLOYMENT_ID: process.env.VERCEL_DEPLOYMENT_ID ?? null,
      NODE_ENV: process.env.NODE_ENV ?? null,
      isVercelQueueAvailable: isVercelQueueAvailable(),
    });
    const { send } = await import("@vercel/queue");
    try {
      const result = await send(topic, payload, options);
      // eslint-disable-next-line no-console
      console.log(
        "[queue-debug] enqueue: send() result",
        JSON.stringify({ topic, result }),
      );
      return result;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("[queue-debug] enqueue: send() threw", {
        topic,
        errorName: error instanceof Error ? error.name : typeof error,
        errorMessage: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  if (options.delaySeconds) {
    // Inline mode has no scheduler. The only delayed job is the push
    // receipt audit, which is a prod-observability concern — skip it
    // instead of blocking the request or recursing forever.
    // eslint-disable-next-line no-console
    console.log(`[queue] inline driver: skipping delayed job on topic "${topic}"`);
    return;
  }

  const handler = await INLINE_HANDLERS[topic]();
  await handler(payload);
};
