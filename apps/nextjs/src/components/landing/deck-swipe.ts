/**
 * The app's swipe physics (apps/mobile/src/views/(tabs)/Swipe/components/
 * SwipeHandler): a card commits past 100px, tilts 8deg per 100px, and a
 * sideways flick faster than 0.11px/ms commits from 24px.
 */
export type Swipe = "nope" | "maybe" | "like";

const ACTION_OFFSET = 100;
const ROTATION = 8;
const FLICK = 0.11;
const FLICK_MIN = 24;

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

export const cardTransform = (x: number, y: number) =>
  `translate(${x}px, ${y}px) rotate(${(x / ACTION_OFFSET) * ROTATION}deg)`;

/** The tinted reaction on the card fades in between 10px and 100px. */
export const feedbackOpacity = (x: number, y: number) => ({
  like: clamp01((x - 10) / 90),
  nope: clamp01((-x - 10) / 90),
  maybe: clamp01((-y - 10) / 90),
});

export type Lean = { dir: Swipe; amount: number; armed: boolean };

/** Which answer the card leans toward, how far (0..1), and whether it would commit. */
export const leanOf = (x: number, y: number): Lean | undefined => {
  const across = Math.abs(x) / ACTION_OFFSET;
  const up = Math.max(0, -y) / ACTION_OFFSET;
  const amount = Math.min(1, Math.max(across, up));
  if (amount < 0.1) return undefined;
  const sideways: Swipe = x < 0 ? "nope" : "like";
  if (Math.abs(x) > ACTION_OFFSET)
    return { dir: sideways, amount, armed: true };
  if (y < -ACTION_OFFSET) return { dir: "maybe", amount, armed: true };
  return { dir: across >= up ? sideways : "maybe", amount, armed: false };
};

/** Where a released card goes, from its offset and its velocity in px/ms; `undefined` snaps it back. */
export const releaseSwipe = (
  x: number,
  y: number,
  vx: number,
  vy: number,
): Swipe | undefined => {
  const flick =
    Math.abs(vx) > FLICK &&
    Math.abs(x) > FLICK_MIN &&
    Math.sign(vx) === Math.sign(x);
  if (Math.abs(x) > ACTION_OFFSET || flick) return x < 0 ? "nope" : "like";
  if (y < -ACTION_OFFSET || (vy < -FLICK && y < -FLICK_MIN)) return "maybe";
  return undefined;
};
