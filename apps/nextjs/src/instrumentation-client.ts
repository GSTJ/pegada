import { initWebAnalytics } from "magic-observability/web";

import { deployEnvironment, deployRelease } from "@/env";

/**
 * Browser telemetry, started before hydration. Next 15.3+ evaluates this file
 * automatically — there is no import of it anywhere, and adding one would run
 * it twice.
 *
 * `NEXT_PUBLIC_POSTHOG_KEY` is not set for this project yet. Until it is, this
 * returns a no-op client: pageviews, exceptions and `capture()` calls all go
 * nowhere, nothing is written to the console, and nothing has to change here
 * on the day the key lands.
 */
initWebAnalytics({
  environment: deployEnvironment(),
  release: deployRelease(),
});
