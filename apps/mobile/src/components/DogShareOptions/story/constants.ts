/**
 * Fixed palettes and the concept-to-card conversion for the two story
 * compositions. This PNG is a brand artifact seen on Instagram, outside the
 * app, so its colours never read from the device theme via `useUnistyles` —
 * they are the same regardless of what theme the sharer has picked.
 *
 * Both palettes are lifted verbatim from the approved concept art
 * (`06-dm-aberta` and `02-role-ticket`) so the shipped card and the concept
 * renders are the same artwork.
 */

/** Shared across both compositions: everything is drawn in hard black line. */
export const INK = "#111111";
export const WHITE = "#FFFFFF";

/** Concept 06, "DM aberta": acid yellow paper, teal checker, pink marker. */
export const DM = {
  paper: "#F4E55D",
  checker: "#31C7BD",
  edge: "#EF62A1",
  lime: "#D6FB43",
  bubbleTeal: "#31C7BD",
  bubblePink: "#EF62A1",
  ctaPink: "#D7377C",
} as const;

/** Concept 02, "Rolê ticket": navy stock, cream stub, yellow rail. */
export const TICKET = {
  navy: "#162348",
  cream: "#F1EAD8",
  dot: "#F0E7D2",
  stripePink: "#EF62A1",
  stripeYellow: "#F7D34C",
  rail: "#F7D34C",
} as const;

/**
 * The concepts are drawn on a 1080x1920 grid; the card is laid out at 360x640
 * points and `captureRef` multiplies back up (see `story-card-styles.ts`), so
 * the two differ by exactly this factor.
 *
 * Every measurement taken from a concept's CSS passes through `px` and
 * nowhere else, which is what lets the variants read as the concept files
 * they were lifted from — `px(690)` instead of a bare `230`.
 *
 * Instagram reserves roughly the top and bottom 250px of the frame for its
 * own chrome, so both variants keep every piece of meaningful content between
 * `px(255)` and `px(1665)` and let only background texture bleed past it.
 */
const CONCEPT_SCALE = 3;
export const px = (concept: number) => concept / CONCEPT_SCALE;

/**
 * Gilroy's own vertical metrics, per em. The family ships at 1000 units per
 * em with an hhea ascender of 1100, a descender of -192 and a line gap of
 * 250; cap height is 700 and x-height 500, identical across every weight the
 * card sets.
 *
 * They are here because iOS lays text out against them and a browser does
 * not. Both put the same glyphs in the same places relative to the BASELINE;
 * they disagree about where that baseline sits inside the box:
 *
 * - CSS centres the font's content box (ascender + descender) inside the line
 *   box, so half the leading falls above the run and half below.
 * - TextKit hangs the run from the ascender and lets the leading fall
 *   underneath, whatever `lineHeight` says — the line height decides how far
 *   apart wrapped lines sit and how tall the box measures, not where the
 *   first baseline lands. Set tighter than the font's own box, the
 *   descenders spill rather than the caps being cropped, which is what lets
 *   the few wrapped runs that must fit a fixed space keep the concept's
 *   leading.
 *
 * So every offset lifted from a concept is converted through the CAP LINE,
 * the one landmark the two agree on — and never through a box height, which
 * `UIFont` reports a few points short of what these numbers predict.
 */
const ASCENT = 1.1;
const DESCENT = 0.192;
const LINE_GAP = 0.25;
const CAP_HEIGHT = 0.7;
const X_HEIGHT = 0.5;

/** Ascender + descender: the font's content box, what CSS half-leads. */
const CONTENT = ASCENT + DESCENT;

/** The font's natural line box, as a multiple of the font size. */
export const GILROY_LINE = CONTENT + LINE_GAP;

/** The box a run occupies with no `lineHeight` set, which is how the card
 *  sets every line that stands on its own. */
export const lineBox = (fontSize: number) => fontSize * GILROY_LINE;

/** Cap line, baseline, and the centres of the cap band and the x-height band,
 * measured down from the top of a `lineBox(fontSize)` box, as multiples of
 * the font size. */
export const CAP_LINE = ASCENT - CAP_HEIGHT;
export const BASELINE = ASCENT;
export const CAP_CENTRE = ASCENT - CAP_HEIGHT / 2;
export const X_CENTRE = ASCENT - X_HEIGHT / 2;

/**
 * `top` for a run at `px(conceptSize)` whose CAP LINE has to land on
 * `conceptCapY` in the concept's 1080x1920 grid.
 */
export const capTop = (conceptCapY: number, conceptSize: number) =>
  px(conceptCapY - conceptSize * CAP_LINE);

/**
 * The half-leading a browser puts above a run and iOS does not, for the
 * boxes the concept positions by padding rather than by offset: add it to
 * the padding above the run and take it off the padding below, and the box
 * keeps the concept's height with the type where the concept draws it.
 */
export const halfLeading = (conceptSize: number, leading = GILROY_LINE) =>
  px((conceptSize * (leading - CONTENT)) / 2);

/**
 * Gilroy's arrow (U+2192, in the family — no fallback font is involved) is
 * drawn between 50 and 650 units above the baseline, so its ink centre is
 * this far up. Both variants centre the arrow on that rather than on its line
 * box, which is what "optically centred in the circle" means here.
 */
export const ARROW_INK_CENTRE = 0.35;

/** `Logo`'s natural aspect ratio (from its `534 635` viewBox), height/width. */
export const PAW_ASPECT = 635 / 534;

/**
 * The concepts are typeset in Gilroy, the family the app already bundles
 * (`Font` in `@pegada/shared/themes/themes`), so nothing here is an
 * approximation of another typeface: `font-weight: 900` is
 * `fontWeight="black"` (ExtraBold), `600` is `"semibold"`, and every
 * `letter-spacing` goes through `px` like any other measurement.
 */
