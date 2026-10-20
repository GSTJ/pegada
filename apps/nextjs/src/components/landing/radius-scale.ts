/** The app's Maximum Distance slider: 1 to 300 km in steps of 5, and 300 means no limit. */
export const RADIUS_MAX = 300;
const STEP = 5;
const SWEEP_TO = 50;

/** The map squeezes its rings so 300 km fits: log scale, 0 at you, 1 at 300 km. */
export const ringOf = (km: number) => Math.log1p(km) / Math.log1p(RADIUS_MAX);

/** The slider's 0 still means 1 km. */
export const radiusKm = (value: number) => Math.max(1, value);

export const inRadius = (value: number, km: number) =>
  value >= RADIUS_MAX || km <= radiusKm(value);

const easeInOutQuart = (t: number) =>
  t < 0.5 ? 8 * t ** 4 : 1 - (-2 * t + 2) ** 4 / 2;

/** The slider during its one scripted sweep, 300+ in to 50 km, at progress 0..1. */
export const sweepValue = (progress: number) =>
  Math.round(
    (RADIUS_MAX + (SWEEP_TO - RADIUS_MAX) * easeInOutQuart(progress)) / STEP,
  ) * STEP;

/** The dogs on the map, around you at their real distances. */
export const RADIUS_DOGS = [
  { id: "nina", name: "Nina", km: 3, angle: -58, side: "right" },
  { id: "bento", name: "Bento", km: 12, angle: 152, side: undefined },
  { id: "maui", name: "Maui", km: 246, angle: -18, side: "edge" },
] as const;
