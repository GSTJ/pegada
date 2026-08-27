/**
 * Post-check for flow 36 (signin-signup-keyboard-clearance.yaml).
 *
 * The flow parks CreateProfile with the Name field focused and the keyboard
 * up. `assertVisible` in the YAML already proves the field and the pinned
 * Create Profile bar are in the accessibility tree — on Android that is the
 * occlusion signal, because a view under the IME drops out of the tree. What
 * it cannot say is by how much they clear the keyboard, so this reads the IME
 * inset out of the window manager and measures it.
 *
 * Android only. On iOS `KeyboardAvoidingView` shrinks the screen for real and
 * the tour reproduced nothing here, so the check prints and exits 0.
 */

import {
  density,
  isAndroid,
  keyboardShown,
  keyboardTopPx,
} from "./lib/android-ime.mjs";
import { readHierarchy } from "./lib/hierarchy.mjs";
import { fail, pass } from "./lib/report.mjs";

const TAG = "check-36";

if (!isAndroid()) {
  pass(TAG, "iOS: keyboard geometry is covered by the flow's own assertions");
  process.exit(0);
}

if (keyboardShown() !== true) {
  fail(
    TAG,
    "the soft keyboard is not up; flow 36 has to leave CreateProfile's Name field focused or it is testing nothing",
  );
}

const imeTop = keyboardTopPx();
if (imeTop === null) {
  fail(TAG, "could not read the ime InsetsSource out of `dumpsys window`");
}

const { byTestId } = readHierarchy();
const scale = density() ?? 1;

// Bounds are pixels on Android; report in dp so the numbers line up with the
// stylesheet.
const px = (value) => Math.round((value / scale) * 10) / 10;

for (const id of ["profile-name", "profile-submit"]) {
  const node = byTestId.get(id);
  if (!node) {
    fail(
      TAG,
      `\`${id}\` is missing from the accessibility tree, which on Android is exactly what "behind the keyboard" looks like`,
    );
  }

  const clearance = imeTop - node.bottom;
  console.log(
    `[${TAG}] ${id}: bottom ${px(node.bottom)}dp, ime top ${px(imeTop)}dp, clearance ${px(clearance)}dp`,
  );

  if (clearance < 0) {
    fail(
      TAG,
      `\`${id}\` runs ${px(-clearance)}dp under the soft keyboard (its bottom is at ${px(node.bottom)}dp, the IME starts at ${px(imeTop)}dp)`,
    );
  }
}

pass(TAG, "the focused signup field and its pinned bar both clear the IME");
