/**
 * Post-check for flow 37 (chat-composer-keyboard.yaml).
 *
 * The flow parks a conversation with the composer focused, the keyboard up and
 * a draft typed. The YAML proves the composer is still in the accessibility
 * tree; this proves it is above the IME rather than a few pixels short of it,
 * and that the draft is above it too.
 *
 * Android only — see checks/36-*.mjs for why.
 */

import {
  density,
  isAndroid,
  keyboardShown,
  keyboardTopPx,
} from "./lib/android-ime.mjs";
import { readHierarchy } from "./lib/hierarchy.mjs";
import { fail, pass } from "./lib/report.mjs";

const TAG = "check-37";

if (!isAndroid()) {
  pass(TAG, "iOS: composer clearance is covered by the flow's own assertions");
  process.exit(0);
}

if (keyboardShown() !== true) {
  fail(
    TAG,
    "the soft keyboard is not up; flow 37 has to leave the composer focused or it is testing nothing",
  );
}

const imeTop = keyboardTopPx();
if (imeTop === null) {
  fail(TAG, "could not read the ime InsetsSource out of `dumpsys window`");
}

const { byTestId } = readHierarchy();
const scale = density() ?? 1;
const dp = (value) => Math.round((value / scale) * 10) / 10;

const composer = byTestId.get("chat-input");
if (!composer) {
  fail(
    TAG,
    '`chat-input` is missing from the accessibility tree, which on Android is exactly what "behind the keyboard" looks like',
  );
}

// The composer is `position: absolute; bottom: 0` inside the screen container,
// so its own bottom edge IS the container's bottom edge — the single number
// that says whether the container shrank for the keyboard.
const clearance = imeTop - composer.bottom;
console.log(
  `[${TAG}] composer bottom ${dp(composer.bottom)}dp, ime top ${dp(imeTop)}dp, clearance ${dp(clearance)}dp`,
);

if (clearance < 0) {
  fail(
    TAG,
    `the composer runs ${dp(-clearance)}dp under the soft keyboard (bottom at ${dp(composer.bottom)}dp, IME starts at ${dp(imeTop)}dp)`,
  );
}

pass(TAG, `the composer clears the IME by ${dp(clearance)}dp`);
