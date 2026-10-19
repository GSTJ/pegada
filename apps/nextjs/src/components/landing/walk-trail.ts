/**
 * The two trails along the four steps: your dog's and the dog it meets. They
 * walk apart through the first two steps, meet at the match and walk on as
 * one pair, inked.
 *
 * Each step owns one stretch of rail that reaches into the gap after it, so
 * the stretches join up. `t` runs along a stretch (0 to 1) and `c` across it,
 * in lane widths. Phones and desktop lay out differently, so each gets its
 * own trail: down the two outer gutters with a meeting band above the match
 * on phones, across the top of the row on desktop.
 */

type Kind = "faint" | "pressed" | "ink";

export type Footfall = {
  /**
   * Phones only: which part of the stretch `t` runs along. `band` is the
   * fixed-height meeting band on top of the match step, `rest` what follows.
   */
  box?: "band" | "rest";
  t: number;
  c: number;
  /** `faint`: a dog you haven't met yet. `ink`: the two of them, after the match. */
  kind: Kind;
  /** Which way the toes point, off straight ahead, in degrees. */
  turn: number;
  /** Press-in delay after the step scrolls in, in ms. */
  delay: number;
};

type Draft = Omit<Footfall, "delay">;

export const STEP_COUNT = 4;
const SIDES = [-1, 1] as const;

/** Small, fixed wobble so the prints don't look stamped by a machine. */
const wobble = (index: number, step: number, side: number) =>
  ((index * 37 + step * 11 + side * 5 + 50) % 11) - 5;

const smooth = (x: number) => {
  const k = Math.min(1, Math.max(0, x));
  return k * k * (3 - 2 * k);
};

/** Toes along the direction of travel: straight ahead is 0, CSS degrees. */
const heading = (dx: number, dy: number) =>
  Math.round((-Math.atan2(dx, dy) * 180) / Math.PI);

const withDelays = (
  feet: Draft[],
  stepMs: number,
  beat: (foot: Draft) => number,
  start = 0,
) =>
  feet.map((foot, rank) => ({
    ...foot,
    delay: start + rank * stepMs + beat(foot),
  }));

/* ---------- Phones ---------- */

/** A lane's width at 390 and the meeting band's height, to aim the toes. */
const PHONE_LANE_PX = 150;
const PHONE_BAND_PX = 200;
const PHONE_GAIT = 0.035;
/** Side by side, the pair walks this far either side of its line. */
const PAIR = 0.06;
const MEET_PHONE = 0.56;

const gutters = (step: number, count: number): Draft[] =>
  SIDES.flatMap((side) =>
    Array.from({ length: count }, (_, index) => ({
      t: (index + (side === 1 ? 0.55 : 0.1)) / count,
      c: side + (index % 2 ? PHONE_GAIT : -PHONE_GAIT),
      kind:
        step === 0 && side === 1 ? ("faint" as const) : ("pressed" as const),
      turn: wobble(index, step, side),
    })),
  );

/** The pair, inked, down the left gutter. */
const pairDown = (
  step: number,
  count: number,
  until = 1,
  box?: "rest",
): Draft[] =>
  SIDES.flatMap((side) =>
    Array.from({ length: count }, (_, index) => ({
      box,
      t: (index + (side === 1 ? 0.25 : 0.75)) / count,
      c: -1 + side * PAIR,
      kind: "ink" as const,
      turn: wobble(index, step, side),
    })).filter((foot) => foot.t < until),
  );

/** In the band: in from both gutters, the meeting, then off together to the left. */
const meeting = (): Draft[] => {
  const closing = SIDES.flatMap((side) =>
    Array.from({ length: 5 }, (_, index) => {
      const t = ((index + (side === 1 ? 0.5 : 0)) / 5) * 0.47;
      const at = (x: number) => side * (1 - smooth(x / 0.5));
      return {
        box: "band" as const,
        t,
        c: at(t) + (index % 2 ? PHONE_GAIT : -PHONE_GAIT),
        kind: "pressed" as const,
        turn: heading(
          (at(t + 0.01) - at(t)) * PHONE_LANE_PX,
          0.01 * PHONE_BAND_PX,
        ),
      };
    }),
  ).filter((foot) => foot.t < 0.45);

  const line = (t: number) => -smooth((t - 0.66) / 0.34);
  const leaving = SIDES.flatMap((side) =>
    Array.from({ length: 3 }, (_, index) => {
      const t = 0.74 + index * 0.09 + (side === 1 ? 0.045 : 0);
      return {
        box: "band" as const,
        t,
        c: line(t) + side * PAIR,
        kind: "ink" as const,
        turn: heading(
          (line(t + 0.01) - line(t)) * PHONE_LANE_PX,
          0.01 * PHONE_BAND_PX,
        ),
      };
    }),
  );

  return [...closing, ...leaving];
};

const byTrack = (a: Draft, b: Draft) =>
  (a.box === "rest" ? 1 : 0) - (b.box === "rest" ? 1 : 0) || a.t - b.t;

const PHONE_DRAFTS: Draft[][] = [
  gutters(0, 12),
  gutters(1, 12),
  [...meeting(), ...pairDown(2, 7, 1, "rest")],
  pairDown(3, 8, 0.85),
].map((feet) => [...feet].sort(byTrack));

/** For browsers without scroll-driven animations; the rest press in as each print scrolls in. */
export const PHONE_TRAIL: Footfall[][] = PHONE_DRAFTS.map((feet, step) =>
  withDelays(feet, step === 2 ? 60 : 40, (foot) =>
    step === 2 && foot.kind === "ink" ? 260 : 0,
  ),
);

export const PHONE_STAMP = {
  t: MEET_PHONE,
  delay:
    (PHONE_DRAFTS[2]?.filter((foot) => foot.kind !== "ink").length ?? 0) * 60 +
    130,
};

/* ---------- Desktop ---------- */

/** Where in the match step the trails meet. */
const MEET_DESKTOP = 0.36;
const PER_LANE = 7;

const spreadAt = (step: number, t: number) => {
  if (step === 0) return { spread: 1 - 0.15 * t, gait: 0.16 };
  if (step === 1) return { spread: 0.85 - 0.3 * t, gait: 0.16 };
  if (step === 2 && t < MEET_DESKTOP)
    return { spread: 0.55 * (1 - t / MEET_DESKTOP), gait: 0.16 };
  return { spread: 0.34, gait: 0.08 };
};

const desktopKind = (step: number, side: number, together: boolean): Kind => {
  if (together) return "ink";
  return step === 0 && side === 1 ? "faint" : "pressed";
};

const desktopStep = (step: number): Draft[] => {
  const feet = SIDES.flatMap((side) =>
    Array.from({ length: PER_LANE }, (_, index): Draft[] => {
      // The other dog's lane steps half a stride behind, so the feet interleave.
      const t = (index + (side === 1 ? 0.5 : 0.1)) / PER_LANE;
      // Together, the pair walks a longer stride: every other footfall.
      const together = step > 2 || (step === 2 && t > MEET_DESKTOP);
      // Clear of the stamp, and the trail fades out before the section ends.
      const skip =
        (step === 2 && t > MEET_DESKTOP - 0.06 && t < MEET_DESKTOP + 0.16) ||
        (step === STEP_COUNT - 1 && t > 0.8) ||
        (together && index % 2 === (side === 1 ? 0 : 1));
      if (skip) return [];
      const foot = together ? Math.floor(index / 2) : index;
      const { spread, gait } = spreadAt(step, t);
      return [
        {
          t,
          c: side * spread + (foot % 2 ? gait : -gait),
          kind: desktopKind(step, side, together),
          turn: wobble(index, step, side),
        },
      ];
    }).flat(),
  );
  return feet.sort((a, b) => a.t - b.t);
};

const DESKTOP_DRAFTS = Array.from({ length: STEP_COUNT }, (_, step) =>
  desktopStep(step),
);
const DESKTOP_MS = 30;
const DESKTOP_BEAT = 200;
const before = (step: number) =>
  DESKTOP_DRAFTS.slice(0, step).reduce((sum, feet) => sum + feet.length, 0);

/** The whole row reveals at once on desktop, so one trot runs left to right across it. */
export const DESKTOP_TRAIL: Footfall[][] = DESKTOP_DRAFTS.map((feet, step) =>
  withDelays(
    feet,
    DESKTOP_MS,
    (foot) => (foot.kind === "ink" ? DESKTOP_BEAT : 0),
    before(step) * DESKTOP_MS,
  ),
);

export const DESKTOP_STAMP = {
  t: MEET_DESKTOP,
  delay:
    (before(2) +
      (DESKTOP_DRAFTS[2]?.filter((foot) => foot.t < MEET_DESKTOP).length ??
        0)) *
      DESKTOP_MS +
    DESKTOP_BEAT / 2,
};
