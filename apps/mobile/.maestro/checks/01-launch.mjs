/**
 * Post-check for flow 01 (01-launch.yaml): liveness via a FRESH maestro
 * session.
 *
 * In-flow `assertVisible: id:` is unreliable right after `launchApp`: the
 * driver session that performed the clearState relaunch keeps serving a stale
 * accessibility snapshot (maestro issue #3056) and never sees the new
 * instance's RN ids, while any fresh session sees them immediately (verified
 * twice from CI's own post-failure hierarchy dumps, runs 28621911520 and
 * 28624965129). `maestro hierarchy` opens a fresh session, so it is the
 * deterministic liveness probe: `signin-email` present means the JS bundle
 * evaluated and SignIn mounted — which catches every launch-crash class this
 * gate has eaten (entitlements, env, a DOM-only branch of a styling library
 * reaching the native bundle, Ads SDK abort).
 *
 * It used to run `maestro hierarchy` with no `--device`, which is the one
 * thing it cannot do. Unlike the helpers this file now borrows, maestro does
 * not quietly pick the wrong phone — it refuses:
 *
 *     Multiple devices connected. Please specify a device using --device <id>.
 *
 * On any machine with an emulator up alongside the simulator, flow 01 failed
 * with "signin-email missing from the accessibility hierarchy" while the app
 * was alive and sitting on SignIn. `lib/device.mjs` already knows which device
 * the flow ran on and `lib/hierarchy.mjs` already passes `--device`; this just
 * uses them.
 */

import { readHierarchy } from "./lib/hierarchy.mjs";
import { fail, pass } from "./lib/report.mjs";

const TAG = "check-01";

let hierarchy;
try {
  hierarchy = readHierarchy();
} catch (error) {
  fail(TAG, `could not read the accessibility hierarchy: ${error.message}`);
}

if (hierarchy.byTestId.has("signin-email")) {
  pass(
    TAG,
    "signin-email present in a fresh a11y snapshot (app is alive on SignIn)",
  );
} else {
  fail(
    TAG,
    "signin-email missing from the accessibility hierarchy. Either the app " +
      "crashed after launch (check crash-diagnostics) or the a11y unlock is " +
      "not active in this build (EXPO_PUBLIC_MAESTRO_E2E).",
  );
}
