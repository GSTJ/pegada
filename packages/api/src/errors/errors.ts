import { config } from "../shared/config";
import { observability } from "../shared/observability";

/**
 * The API's one reporting funnel. Same signature it always had; the transport
 * is now `magic-observability/node`, which turns a non-`Error` throw into one
 * with a usable stack and flattens `context` into dotted, filterable keys.
 */
// oxlint-disable-next-line typescript/no-explicit-any -- Anything can be thrown, and this is the boundary that has to accept it.
export const sendError = (error: any, context?: Record<string, unknown>) => {
  if (config.NODE_ENV === "development") {
    // oxlint-disable-next-line no-console -- Development-only mirror of what gets reported to PostHog.
    console.error(error);
  }

  observability.captureError(error, context);
};

/**
 * Product events, on the same funnel as {@link sendError} and for the same
 * reason: `shared/observability.ts` is the only module allowed to know which
 * SDK is underneath, and everything that reports goes through this file.
 *
 * `distinctId` is a property rather than an argument because that is how the
 * node adapter reads it; without one the event is attributed to `"server"`.
 *
 * The try/catch is not decoration. Every call site here sits on a path a user
 * is waiting on, and an event that fails to serialise must not become a login
 * that fails to complete.
 */
export const sendEvent = (
  event: string,
  properties?: Record<string, unknown>,
) => {
  try {
    observability.capture(event, properties);
  } catch (error) {
    if (config.NODE_ENV === "development") {
      // oxlint-disable-next-line no-console -- Development-only; a swallowed analytics failure is otherwise invisible.
      console.error(error);
    }
  }
};

export const logDebug = (...props: unknown[]) => {
  if (config.NODE_ENV === "development") {
    // oxlint-disable-next-line no-console -- Development-only mirror of what gets reported to PostHog.
    console.log(...props);
  }
};

export const errorDebug = (...props: unknown[]) => {
  if (config.NODE_ENV === "development") {
    // oxlint-disable-next-line no-console -- Development-only mirror of what gets reported to PostHog.
    console.error(...props);
  }
};
