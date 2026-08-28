/**
 * Post-check for flow 38 (status-bar-legibility.yaml).
 *
 * The flow parks the Messages tab — a white screen — after a visit to the
 * Profile tab, which asks for light status-bar icons. This samples the real
 * frame buffer and requires the system's own icons to still be readable
 * against it.
 *
 * The status bar is not in the app's accessibility tree and its colour is not
 * a style anything can be asserted on, so pixels are the only evidence. Two
 * regions are sampled rather than the whole strip: the clock on the left and
 * the icon cluster on the right, with the middle skipped because a notch or
 * cutout lives there and is black on every build.
 *
 * Android only. On iOS the fallback style is `"default"`, which means "let
 * UIKit decide" and resolves correctly; the tour reproduced nothing there.
 */

import { isAndroid, statusBarInsetPx } from "./lib/android-ime.mjs";
import { fail, pass } from "./lib/report.mjs";
import { captureScreen } from "./lib/screen.mjs";

const TAG = "check-38";

if (!isAndroid()) {
  pass(TAG, "iOS: the status-bar fallback style is `default`, which adapts");
  process.exit(0);
}

/** Anything this dark on a white bar is ink, not background. */
const INK = 140;
/** A glyph at 420dpi is hundreds of pixels; 60 rules out compression noise. */
const MIN_INK_PIXELS = 60;

// `isAndroid()` above already resolved the device, so this samples the same
// emulator rather than asserting a platform of its own.
const screen = captureScreen();
const barHeight = statusBarInsetPx() ?? Math.round(screen.height * 0.031);

const countInk = (x0, x1) => {
  let ink = 0;
  // Skip the top 3 rows: the very edge of the strip is antialiased against
  // the display bezel on some skins.
  for (let y = 3; y < barHeight; y += 1) {
    for (let x = x0; x < x1; x += 1) {
      const [r, g, b] = screen.at(x, y);
      if (0.299 * r + 0.587 * g + 0.114 * b < INK) ink += 1;
    }
  }
  return ink;
};

const clock = countInk(
  Math.round(screen.width * 0.05),
  Math.round(screen.width * 0.25),
);
const icons = countInk(
  Math.round(screen.width * 0.72),
  Math.round(screen.width * 0.97),
);

console.log(
  `[${TAG}] status bar ${screen.width}x${barHeight}px: clock ink ${clock}px, icon ink ${icons}px (threshold ${MIN_INK_PIXELS})`,
);

if (clock < MIN_INK_PIXELS || icons < MIN_INK_PIXELS) {
  fail(
    TAG,
    `the status bar is blank on a light screen: ${clock}px of ink where the clock is and ${icons}px where the icons are. White-on-white — the light style from the previous screen was never handed back.`,
  );
}

pass(TAG, "the status bar still has dark icons on a light screen");
