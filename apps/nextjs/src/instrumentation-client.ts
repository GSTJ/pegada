import { deployEnvironment, deployRelease } from "@/env";
import { startWebAnalytics } from "@/services/analytics";

/**
 * Browser telemetry, scheduled before hydration and loaded after it (see
 * `startWebAnalytics`). Next 15.3+ evaluates this file
 * automatically — there is no import of it anywhere, and adding one would run
 * it twice.
 *
 * `NEXT_PUBLIC_POSTHOG_KEY` is not set for this project yet. Until it is, the
 * client it loads is a no-op: pageviews, exceptions and `capture()` calls all go
 * nowhere, nothing is written to the console, and nothing has to change here
 * on the day the key lands.
 */
startWebAnalytics({
  environment: deployEnvironment(),
  release: deployRelease(),
});
