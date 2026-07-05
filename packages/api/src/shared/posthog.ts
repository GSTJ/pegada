import { PostHog } from "posthog-node";

import { config } from "./config";

// Single PostHog client for the whole API: feature flags (FlagService),
// error tracking (errors.ts), and any server-side events. flushAt/flushInterval
// keep it responsive in the short-lived serverless functions we run on.
export const posthog = new PostHog(config.POSTHOG_API_KEY, {
  host: config.POSTHOG_HOST,
  flushAt: 1,
  flushInterval: 0,
});
