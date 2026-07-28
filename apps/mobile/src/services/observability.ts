import * as Updates from "expo-updates";

import { getExpoPostHog, initExpo } from "magic-observability/expo";

import { config } from "@/services/config";

/**
 * `code_bundle_id` in Bugsnag terms: the OTA update group the running
 * JavaScript came from. An `eas update` ships new JS under an unchanged binary
 * version, so the app's semver cannot identify which bundle a stack trace came
 * from — the update group can, and it is what the sourcemaps uploaded by
 * `scripts/upload-posthog-sourcemaps-ota.sh` are filed under. Undefined in a
 * dev client and on the very first launch of a fresh binary, which is correct:
 * there is no OTA update in play.
 */
const { manifest } = Updates;
const metadata = "metadata" in manifest ? manifest.metadata : undefined;
const updateGroup =
  metadata && "updateGroup" in metadata ? metadata.updateGroup : undefined;

/**
 * The app's single PostHog client, built through `magic-observability/expo` so
 * every GSTJ project reports exceptions in the same shape.
 *
 * `initExpo` constructs a standalone instance rather than letting
 * `<PostHogProvider apiKey>` do it, because the provider has no way to
 * configure `errorTracking`. `_layout` hands the raw instance back to the
 * provider for screen tracking and hook access; the non-React singletons
 * (analytics, sagas, util modules) reach the same client through the exports
 * here.
 *
 * `environment` and `release` are registered as super properties by `initExpo`
 * itself, so every event and every exception carries them without a separate
 * `register()` call at boot.
 *
 * With no key resolved this is a no-op client — every method present, every
 * method silent, nothing written to the console. A clone without a `.env`
 * boots and runs.
 */
export const observability = initExpo({
  key: config.POSTHOG_KEY,
  host: config.POSTHOG_HOST,
  environment: config.ENV,
  release: typeof updateGroup === "string" ? updateGroup : undefined,
  // Manual events only: this app fires explicit capture()/screen() calls, and
  // replay is off at the project level anyway.
  sessionReplay: false,
  posthogOptions: { captureAppLifecycleEvents: false },
});

/**
 * The raw `posthog-react-native` instance, or `null` when telemetry is off.
 *
 * Needed by `<PostHogProvider client={...}>` and by anything reaching for
 * feature flags or surveys — the shared client surface deliberately does not
 * wrap those. Exposed as a function so the `null` case stays visible at the
 * call site.
 */
export { getExpoPostHog };
