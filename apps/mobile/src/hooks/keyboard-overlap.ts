/**
 * How much of the window's bottom edge the soft keyboard covers, expressed as
 * two pure decisions: which notifications a screen has to listen to, and what
 * each one implies.
 *
 * Separated from `use-keyboard-aware-scroll.ts` so it can be tested. What
 * broke here is not arithmetic, it is *which events are subscribed*, and that
 * is only observable by replaying a notification stream — which needs no React
 * Native, no renderer and no device.
 */

/** Platform, passed in rather than read, so the rules can be replayed. */
export type KeyboardPlatform = "ios" | "android";

export type KeyboardOverlapEvent =
  | "keyboardDidHide"
  | "keyboardDidShow"
  | "keyboardWillChangeFrame";

/** The half of `KeyboardEvent["endCoordinates"]` these rules read. */
export type KeyboardCoordinates = {
  /** Keyboard height. iOS and Android both fill this in. */
  height: number;
  /** Top edge of the keyboard in screen space. Only meaningful on iOS. */
  screenY: number;
};

type Inputs = {
  bottomInset: number;
  platform: KeyboardPlatform;
  windowHeight: number;
};

/**
 * The notifications a screen must subscribe to.
 *
 * iOS listens for `keyboardWillChangeFrame` because it covers show, hide and
 * every resize in between (an autocomplete bar appearing, a hardware keyboard
 * connecting) and rides the keyboard's own animation curve.
 *
 * It listens for `keyboardDidHide` as well, and that one is not redundant.
 * `Keyboard.metrics()` — what a mounting screen seeds itself from, so a screen
 * ENTERED with the keyboard already up is padded on its first frame — is set
 * by `keyboardDidShow` and cleared by `keyboardDidHide`. It therefore stays
 * non-null for the whole dismissal animation, while `keyboardWillChangeFrame`
 * fires at the START of it. A screen pushed mid-dismissal lands in the gap:
 * it seeds itself from a keyboard that is already going away, and the only
 * event that would have corrected it has already been delivered to the screen
 * it replaced.
 *
 * That gap is not theoretical. Submitting the one-time code pushes
 * CreateProfile while the OTP keypad is dismissing, and CreateProfile came up
 * with ~400dp of dead white space below its pinned Create Profile bar, no
 * keyboard anywhere, and its Name and Bio fields pushed off the bottom — every
 * time, on a Release build.
 *
 * `keyboardDidHide` closes it: whatever the seed guessed, the moment React
 * Native observes the keyboard is gone the padding drops to zero. When the
 * keyboard really is up it never fires, so it costs nothing.
 */
export const keyboardOverlapEvents = (
  platform: KeyboardPlatform,
): KeyboardOverlapEvent[] =>
  platform === "ios"
    ? ["keyboardWillChangeFrame", "keyboardDidHide"]
    : ["keyboardDidShow", "keyboardDidHide"];

/**
 * The overlap implied by one notification.
 *
 * The two platforms read different halves of the same event because React
 * Native fills them in differently:
 *
 *  * iOS reports the keyboard's own top edge in `screenY`, so the covered
 *    height is the window height minus it, and it reports `screenY` at the
 *    window's bottom when the keyboard goes away.
 *  * Android's `ReactRootView` sets `screenY` to the bottom of the window's
 *    *visible display frame*, which is only the keyboard's top edge if the
 *    window resized — i.e. never in an edge-to-edge app. Its `height` is
 *    honest, though: `imeInsets.bottom - systemBarInsets.bottom`. Adding the
 *    bottom safe-area inset back gives the full inset the IME occupies.
 */
export const overlapForEvent = ({
  bottomInset,
  coordinates,
  name,
  platform,
  windowHeight,
}: Inputs & {
  coordinates: KeyboardCoordinates;
  name: KeyboardOverlapEvent;
}): number => {
  if (name === "keyboardDidHide") return 0;

  return platform === "ios"
    ? Math.max(0, windowHeight - coordinates.screenY)
    : coordinates.height + bottomInset;
};

/**
 * The overlap to start from, given `Keyboard.metrics()` at mount time.
 *
 * `keyboardDidShow` fires when the keyboard APPEARS, and a screen can be
 * entered with it already up — sign-in's email field is focused, tapping
 * Continue pushes the one-time-code screen, focus moves from one field
 * straight to another and the IME never leaves. No event fires, and a screen
 * that only listened would be padded by zero with its resend control behind
 * the keypad.
 *
 * The seed is a guess about a keyboard that may already be on its way out;
 * `keyboardDidHide` is what corrects it.
 */
export const seedOverlap = ({
  bottomInset,
  metrics,
  platform,
  windowHeight,
}: Inputs & { metrics: KeyboardCoordinates | null | undefined }): number => {
  if (!metrics) return 0;

  return overlapForEvent({
    bottomInset,
    coordinates: metrics,
    name: platform === "ios" ? "keyboardWillChangeFrame" : "keyboardDidShow",
    platform,
    windowHeight,
  });
};
