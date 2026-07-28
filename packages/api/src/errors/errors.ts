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
