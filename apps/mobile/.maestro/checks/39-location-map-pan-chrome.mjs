/**
 * Post-check for flow 39 (location-map-pan-chrome.yaml).
 *
 * The flow parks the location map at rest after two pans. Its own assertions
 * cover the callout and the CTA, both of which carry text. The pin does not:
 * it is an SVG with no accessibility identity, and its tint is the third
 * symptom of the same bug — the dark "dragging" copy is drawn over the pink
 * one at `opacity: dragging.value`, so a pin that stays dark is a `dragging`
 * that never came back to 0.
 *
 * So this one counts pink pixels where the pin is. Runs on both platforms:
 * the marker is app-drawn, not a system control, and the palette is shared.
 */

import { fail, pass } from "./lib/report.mjs";
import { boundingBox, captureScreen } from "./lib/screen.mjs";

const TAG = "check-39";

/**
 * `LightTheme.colors.primary` is `hsl(333, 81%, 66%)` = rgb(239, 98, 161).
 * The window is generous because the pin is drawn over a blurred map surface
 * and antialiased at 3x, but it excludes the dark overlay (rgb(2, 6, 23)) and
 * the map's beige no-tiles background by a wide margin.
 */
const isPink = ([r, g, b]) =>
  r > 200 && g > 55 && g < 150 && b > 110 && b < 205 && r - g > 70;

/** The pin is ~31x37dp; even at 1x that is far more than this many pixels. */
const MIN_PIN_PIXELS = 150;

const platform = (process.env.MAESTRO_PLATFORM ?? "ios").toLowerCase();
const screen = captureScreen({ platform });

// The marker's container is an absolute fill with `justifyContent: center`,
// and its content sits 20dp above the middle. This window is deliberately
// wider than the pin and nowhere near the bottom-action bar, whose button is
// also pink — sampling that would make the check pass on the CTA alone.
const region = {
  x: Math.round(screen.width * 0.35),
  right: Math.round(screen.width * 0.65),
  y: Math.round(screen.height * 0.33),
  bottom: Math.round(screen.height * 0.55),
};

const box = boundingBox(screen, isPink, region);
const found = box?.count ?? 0;

console.log(
  `[${TAG}] ${found}px of pin tint in ${region.right - region.x}x${region.bottom - region.y} around the map centre (threshold ${MIN_PIN_PIXELS})`,
);

if (found < MIN_PIN_PIXELS) {
  fail(
    TAG,
    `the map pin has lost its tint after panning: only ${found}px of primary colour where the marker is. The dark drag overlay is still fully opaque, i.e. \`dragging\` never returned to 0 — the same reason the Confirm button disappears.`,
  );
}

pass(TAG, `the pin is back to its resting tint (${found}px)`);
