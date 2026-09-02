import type {
  ServerEventName,
  ServerEventProperties,
} from "@pegada/shared/analytics/events";

import { observability } from "./observability";

/**
 * Product events from the API, typed against the same catalogue the app uses.
 *
 * Two rules hold here, and they are the reason this is a function rather than a
 * direct `observability.capture` at each call site:
 *
 * 1. A name and its properties come from `@pegada/shared/analytics/events`, so
 *    a server event and the app event it pairs with cannot drift apart.
 * 2. Nothing it does can fail a request. The underlying client already swallows
 *    SDK errors, and `runtime: "serverless"` means the write is queued and
 *    flushed rather than awaited, but this is a mutation path — the guard is
 *    written down rather than inherited.
 */
export const captureEvent = <Name extends ServerEventName>(
  distinctId: string,
  event: Name,
  properties: ServerEventProperties[Name],
) => {
  try {
    observability.capture(event, {
      distinctId,
      ...properties,
    });
  } catch {
    // Deliberately silent. A dropped analytics event is a gap in a chart; a
    // throw here would be a failed swipe or an unsent message.
  }
};

/** Whole seconds between two instants, floored at zero and rounded down. */
export const secondsBetween = (from: Date, to: Date) =>
  Math.max(0, Math.floor((to.getTime() - from.getTime()) / 1000));
