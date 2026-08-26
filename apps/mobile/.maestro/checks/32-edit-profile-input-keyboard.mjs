/**
 * Post-check for flow 32 (edit-profile-input-keyboard.yaml).
 *
 * The flow leaves EditProfile with the Name field focused and the keyboard up.
 * This asserts what `above:` cannot: the field's BOTTOM edge clears the
 * bottom-action bar, rather than merely starting above it.
 *
 * Geometry, all in points, straight out of `maestro hierarchy`:
 *
 *   barTop      = save button's top - the bar's own top padding
 *   fieldBottom = the field's text frame bottom + the Input's bottom padding
 *
 * Maestro reports a TextInput's text frame, not the rounded box drawn around
 * it, so the box's padding has to be added back — those two constants are the
 * `Input` component's `content` style (`paddingBottom: theme.spacing[3.5]`,
 * `borderWidth: theme.stroke.md`) and `BottomAction`'s container
 * (`paddingTop: theme.spacing[4]`).
 */

import { readHierarchy } from "./lib/hierarchy.mjs";
import { fail, pass } from "./lib/report.mjs";

const TAG = "check-32";

/** BottomAction.Container's `paddingTop: theme.spacing[4]`. */
const BAR_PADDING_TOP = 16;
/** Input's `paddingBottom: theme.spacing[3.5]` plus its 1pt border. */
const INPUT_BOX_BELOW_TEXT = 15;
/** The clearance `useKeyboardAwareScroll` leaves, minus a point of slack. */
const REQUIRED_CLEARANCE = 6;

const { byTestId, screen } = readHierarchy();

const field = byTestId.get("edit-profile-name");
const save = byTestId.get("edit-profile-save");

if (!field || !save) {
  fail(
    TAG,
    `expected EditProfile to still be on screen with the keyboard up; found edit-profile-name=${Boolean(field)} edit-profile-save=${Boolean(save)}`,
  );
}

// With the keyboard down the bar sits at the foot of the screen and the
// measurement below would pass for the wrong reason.
if (save.y > screen.height * 0.75) {
  fail(
    TAG,
    `the keyboard is not up (save button at y=${save.y} of ${screen.height}); the flow must leave the field focused.`,
  );
}

const barTop = save.y - BAR_PADDING_TOP;
const fieldBottom = field.bottom + INPUT_BOX_BELOW_TEXT;
const clearance = barTop - fieldBottom;

console.log(
  `[${TAG}] field bottom ${fieldBottom}, bar top ${barTop}, clearance ${clearance}pt`,
);

if (clearance < REQUIRED_CLEARANCE) {
  fail(
    TAG,
    `the focused field is sliced by the bottom-action bar: it ends at ${fieldBottom}pt and the bar starts at ${barTop}pt (${clearance}pt, need >= ${REQUIRED_CLEARANCE}pt).`,
  );
}

pass(TAG, `focused field clears the bottom-action bar by ${clearance}pt`);
