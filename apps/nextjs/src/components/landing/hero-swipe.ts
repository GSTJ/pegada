/**
 * The app's swipe rules, so the deck on the page throws like the one in the
 * app. Values from `apps/mobile/src/constants.ts` and the swipe gesture
 * (`views/(tabs)/Swipe/components/SwipeHandler`).
 */

/** Past this many px the card commits (`ACTION_OFFSET`). */
export const ACTION_OFFSET = 100;
/** The app's 1000px/s (`ACTION_VELOCITY`), in px/ms for pointer events. */
export const ACTION_VELOCITY = 1;
/** 8° at `ACTION_OFFSET`, and it keeps turning past it (`ROTATION_DEG`). */
export const ROTATION_PER_PX = 8 / ACTION_OFFSET;
/** A thrown card travels 1.7x the deck (`CARD_OUT_WIDTH`, `CARD_OUT_HEIGHT`). */
export const OUT_FACTOR = 1.7;
/**
 * A drag throws in 250ms; a button press glides out in 500ms. Keys commit at
 * once: the app has no keyboard, and a keyed action that waits feels slow.
 */
export const THROW_MS = { gesture: 250, button: 500, key: 0 } as const;
/** The snap-back spring's duration (`SNAP_BACK_SPRING`). */
export const SNAP_BACK_MS = 230;

export type SwipeKind = "nope" | "maybe" | "like";

/** Same order as the app: sideways wins, then up. Down does nothing. */
export const swipeKind = (
  x: number,
  y: number,
  vx: number,
  vy: number,
): SwipeKind | undefined => {
  const sideways =
    Math.abs(x) > ACTION_OFFSET || Math.abs(vx) > ACTION_VELOCITY;
  if (sideways && x < 0) return "nope";
  if (sideways && x > 0) return "like";

  const upright = Math.abs(y) > ACTION_OFFSET || Math.abs(vy) > ACTION_VELOCITY;
  if (upright && y < 0) return "maybe";
};

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

/** `FeedbackCard`: each reaction fades in from 10px to `ACTION_OFFSET`. */
export const feedbackOpacity = (x: number, y: number) => ({
  like: clamp01((x - 10) / (ACTION_OFFSET - 10)),
  nope: clamp01((-x - 10) / (ACTION_OFFSET - 10)),
  maybe: clamp01((-y - 10) / (ACTION_OFFSET - 10)),
});
