/**
 * Post-check for flow 33 (otp-resend-underline.yaml).
 *
 * Invariant: the pink rule under "Resend the code" underlines the label —
 * every pixel of the rule sits below every pixel of the glyphs. The bug had
 * the rule crossing the baseline, so the two bands overlapped by several
 * points.
 *
 * The flow leaves the app parked on the OTP screen, so this reads the live
 * frame buffer. Classification is by hue, not by exact colour, because the
 * whole affordance renders at `opacity: 0.5` while the resend timer runs:
 *
 *   rule   0.5 * primary   over white  ->  ~(244, 182, 209)   r-g ~ 62
 *   label  0.5 * text      over white  ->  ~(133, 136, 143)   r-g ~ -3
 *   pill   0.5 * secondary over white  ->  ~(255, 244, 248)   r-g ~ 11
 *
 * so "saturated pink" and "neutral and dark" separate cleanly, in either
 * theme and at any scale factor.
 */

import { fail, pass } from "./lib/report.mjs";
import { boundingBox, captureScreen, rowsMatching } from "./lib/screen.mjs";

const TAG = "check-33";

const isRule = ([r, g, b]) => r - g >= 30 && r - b >= 8 && r >= 170;
const isGlyph = ([r, g, b]) =>
  Math.max(r, g, b) < 200 && Math.abs(r - g) < 20 && Math.abs(g - b) < 25;

const screen = captureScreen();

const rule = boundingBox(screen, isRule);
if (!rule) {
  fail(
    TAG,
    "no saturated-pink rule found on screen. Is the app still parked on the OTP screen?",
  );
}

// The label sits immediately above the rule. Window the search so the timer
// digits and the OTP cells further up cannot be mistaken for it.
const region = {
  x: Math.max(0, rule.x - 12),
  right: Math.min(screen.width, rule.right + 12),
  y: Math.max(0, rule.y - 140),
  bottom: Math.min(screen.height, rule.bottom + 40),
};

const glyphRows = rowsMatching(screen, isGlyph, region, 2);
if (glyphRows.length === 0) {
  fail(TAG, "found the rule but no label glyphs above it — layout changed?");
}

const glyphBottom = glyphRows.at(-1);
const overlap = glyphBottom - rule.y + 1;

console.log(
  `[${TAG}] rule rows ${rule.y}..${rule.bottom - 1}, glyph rows ${glyphRows[0]}..${glyphBottom}`,
);

// One row of tolerance for the antialiased edge where a descender meets the
// rule; anything more and the rule is drawn across the type.
if (overlap > 1) {
  fail(
    TAG,
    `the rule crosses the label by ${overlap}px: it starts at y=${rule.y} but glyphs run to y=${glyphBottom}. It should underline, not strike through.`,
  );
}

pass(TAG, `rule clears the label by ${-overlap + 1}px`);
