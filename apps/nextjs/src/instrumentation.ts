import { createRequestErrorHandler } from "magic-observability/next";

import {
  deployEnvironment,
  deployRelease,
  posthogHost,
  posthogServerKey,
} from "@/env";

/**
 * Server-side error capture. Next calls `onRequestError` for every uncaught
 * throw in a server component, route handler or server action.
 *
 * The handler skips the edge runtime (`posthog-node` cannot symbolicate
 * there), reads `distinct_id` off the `ph_phc_*_posthog` cookie so a server
 * exception lands on the same person as their browser events, attaches the
 * route metadata Next hands over, and flushes before the function freezes.
 *
 * `register` is required by Next but has nothing to do here — the client is
 * built lazily on the first error rather than on every cold start.
 */
export const register = () => {};

export const onRequestError = createRequestErrorHandler({
  key: posthogServerKey(),
  host: posthogHost(),
  environment: deployEnvironment(),
  release: deployRelease(),
});
