import { getPostHogNode, initNode } from "magic-observability/node";

import { config } from "./config";

/**
 * Single PostHog client for the whole API: feature flags (FlagService), error
 * tracking (errors.ts), and any server-side events.
 *
 * Built through `magic-observability/node` so an exception raised in a tRPC
 * procedure arrives in PostHog looking exactly like one raised in the mobile
 * app: whatever was thrown normalised into a real `Error`, context flattened
 * into keys PostHog can filter on.
 *
 * `runtime: "serverless"` is the old `flushAt: 1, flushInterval: 0` under a
 * name — these functions are frozen the instant they return a response, and a
 * batched event would never leave the process.
 *
 * No key resolved means a silent no-op client, which is what lets the test
 * suite and a fresh checkout run without a PostHog project.
 */
export const observability = initNode({
  // `POSTHOG_KEY` is the shared GSTJ convention; `POSTHOG_API_KEY` is the name
  // this project's deployment environments already store the token under. Both
  // are accepted, newest first, so the rename needs no coordinated deploy.
  key: config.POSTHOG_KEY ?? config.POSTHOG_API_KEY,
  host: config.POSTHOG_HOST,
  environment: config.NODE_ENV,
  runtime: "serverless",
});

/**
 * `posthog-node` itself, for feature flags — `isFeatureEnabled` is not part of
 * the shared client surface, on purpose. `null` when telemetry is off, which
 * `FlagService` already treats as "use the default value".
 */
export { getPostHogNode };
