/**
 * Post-check for flow 40 (preferences-sheet-back-and-keyboard.yaml).
 *
 * The flow leaves Preferences after swiping the breed-picker sheet away with
 * its search field focused. The bug is that the keyboard stays up over a
 * screen that has nothing to type into — an orphan. There is no focused field
 * to assert the absence of and no element the keyboard hides that would be
 * missing, so the only honest source is the input-method service's own view of
 * it.
 *
 * Android only: `mInputShown` has no iOS counterpart, and the flow does not
 * open the sheet there (the @gorhom/bottom-sheet modal disconnects the iOS 26
 * driver).
 */

import { isAndroid, keyboardShown } from "./lib/android-ime.mjs";
import { readHierarchy } from "./lib/hierarchy.mjs";
import { fail, pass } from "./lib/report.mjs";

const TAG = "check-40";

if (!isAndroid()) {
  pass(TAG, "iOS: the sheet half of this flow is Android-only");
  process.exit(0);
}

const { byTestId } = readHierarchy();

// Guard against the check passing because the flow ended up somewhere else
// entirely — which is what the Back-press half of the bug looks like.
if (!byTestId.get("preferences-screen")) {
  fail(
    TAG,
    "Preferences is not on screen; the flow has to end on it for the keyboard assertion below to mean anything",
  );
}

const shown = keyboardShown();
console.log(`[${TAG}] mInputShown=${shown} with Preferences on screen`);

if (shown !== false) {
  fail(
    TAG,
    "the soft keyboard is still up after the picker sheet was dismissed, over a screen with no focused field — an orphaned keyboard",
  );
}

pass(TAG, "the sheet took its keyboard with it");
