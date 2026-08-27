/**
 * Post-check for flow 42 (otp-resend-keyboard-clearance.yaml).
 *
 * The flow parks the one-time-code screen with the keypad up — never
 * dismissed, never re-shown — and proves `otp-resend` is still in the
 * accessibility tree below the last code cell. This adds the number: by how
 * many dp the control's bottom edge clears the IME's inset frame.
 *
 * Android only. On iOS `KeyboardAvoidingView` was already shrinking this
 * screen and the tour reproduced nothing here; the flow's own assertions carry
 * that platform.
 */

import {
  density,
  isAndroid,
  keyboardShown,
  keyboardTopPx,
} from "./lib/android-ime.mjs";
import { readHierarchy } from "./lib/hierarchy.mjs";
import { fail, pass } from "./lib/report.mjs";

const TAG = "check-42";

if (!isAndroid()) {
  pass(TAG, "iOS: resend clearance is covered by the flow's own assertions");
  process.exit(0);
}

if (keyboardShown() !== true) {
  fail(
    TAG,
    "the keypad is not up; flow 42 reproduces nothing unless the screen is entered with the keyboard already showing",
  );
}

const imeTop = keyboardTopPx();
if (imeTop === null) {
  fail(TAG, "could not read the ime InsetsSource out of `dumpsys window`");
}

const { byTestId } = readHierarchy();
const scale = density() ?? 1;
const dp = (value) => Math.round((value / scale) * 10) / 10;

const resend = byTestId.get("otp-resend");
if (!resend) {
  fail(
    TAG,
    '`otp-resend` is missing from the accessibility tree, which on Android is exactly what "behind the keypad" looks like',
  );
}

const clearance = imeTop - resend.bottom;
console.log(
  `[${TAG}] resend bottom ${dp(resend.bottom)}dp, ime top ${dp(imeTop)}dp, clearance ${dp(clearance)}dp`,
);

if (clearance < 0) {
  fail(
    TAG,
    `the resend control runs ${dp(-clearance)}dp under the keypad (bottom at ${dp(resend.bottom)}dp, IME starts at ${dp(imeTop)}dp)`,
  );
}

pass(TAG, `the resend control clears the keypad by ${dp(clearance)}dp`);
