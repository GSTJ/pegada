import PostHog from "posthog-react-native";

import { config } from "@/services/config";

// Single PostHog client for analytics + error tracking. Instantiated as a
// standalone instance (not just the hook) so the non-React singletons —
// analytics, errorTracking, sagas, util modules — can all reach it. Also
// passed to <PostHogProvider client={posthog}> in _layout for the error
// boundary and hook access.
export const posthog = new PostHog(config.POSTHOG_API_KEY, {
  host: config.POSTHOG_HOST,
  // Manual events only — we fire explicit capture()/screen() calls, so keep
  // session replay off and don't auto-capture app lifecycle events.
  enableSessionReplay: false,
  captureAppLifecycleEvents: false,
});
