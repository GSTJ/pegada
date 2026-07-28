import { captureError } from "magic-observability/expo";

import { config } from "./config";
import "./observability";

/**
 * The app's one reporting funnel. Around forty modules call it, so the
 * signature stays put; only the transport moved to `magic-observability`.
 *
 * What that buys: whatever was thrown becomes a real `Error` on the way in (a
 * bare `throw "nope"` used to reach PostHog with no stack and no message), and
 * nested context is flattened to dotted keys PostHog can actually filter on.
 *
 * The bare `./observability` import is for its side effect — it guarantees the
 * client is constructed before the first report, whichever module happens to
 * fail first.
 */
// oxlint-disable-next-line typescript/no-explicit-any -- Anything can be thrown, and this is the boundary that has to accept it.
export const sendError = (error: any, context?: Record<string, unknown>) => {
  if (config.ENV === "development") {
    // oxlint-disable-next-line no-console -- Development-only mirror of what gets reported to PostHog.
    console.error(error);
    return;
  }

  captureError(error, context);
};
