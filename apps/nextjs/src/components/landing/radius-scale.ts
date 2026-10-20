/** The app's Maximum Distance slider: 1 to 300 km in steps of 5, and 300 means no limit. */
export const RADIUS_MAX = 300;
const STEP = 5;

/** The map squeezes its rings so 300 km fits: log scale, 0 at you, 1 at 300 km. */
export const ringOf = (km: number) => Math.log1p(km) / Math.log1p(RADIUS_MAX);

/** The slider's 0 still means 1 km. */
export const radiusKm = (value: number) => Math.max(1, value);

export const inRadius = (value: number, km: number) =>
  value >= RADIUS_MAX || km <= radiusKm(value);

/**
 * The slider while the visitor scrolls through section 03, at progress 0..1:
 * it holds at 300+, pulls in past Maui (246 km) about a quarter of the way,
 * past Bento (12 km) near the end, and rests at 10 km.
 */
const SWEEP: [progress: number, value: number][] = [
  [0, RADIUS_MAX],
  [0.15, RADIUS_MAX],
  [0.45, 150],
  [0.7, 35],
  [0.85, 10],
  [1, 10],
];

export const sweepValue = (progress: number) => {
  const at = Math.min(1, Math.max(0, progress));
  const to = Math.max(
    1,
    SWEEP.findIndex(([p]) => p >= at),
  );
  const [p0, v0] = SWEEP[to - 1] ?? [0, RADIUS_MAX];
  const [p1, v1] = SWEEP[to] ?? [1, 10];
  const t = (at - p0) / (p1 - p0);
  return Math.round((v0 + (v1 - v0) * t) / STEP) * STEP;
};

/** The dogs on the map, around you at their real distances. */
export const RADIUS_DOGS = [
  { id: "nina", name: "Nina", km: 3, angle: -58, side: "right" },
  { id: "bento", name: "Bento", km: 12, angle: 152, side: undefined },
  { id: "maui", name: "Maui", km: 246, angle: -18, side: "edge" },
] as const;
