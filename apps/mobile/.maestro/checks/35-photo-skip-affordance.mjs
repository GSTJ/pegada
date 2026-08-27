/**
 * Post-check for flow 35 (photo-skip-affordance.yaml).
 *
 * Two invariants for the MAESTRO_E2E_SKIP_PHOTO pill, both measured off the
 * live frame buffer because iOS never puts the pill in the accessibility tree:
 *
 *   1. its label occupies ONE line. Two runs of white rows means the text
 *      wrapped, which is what pushed the second line off the cell.
 *   2. no part of the pink `+` button falls inside the pill. The button is
 *      drawn over the pill, so overlapping means a tap target sitting on a
 *      tap target.
 *
 * The pill is found as the largest dark connected component on screen: it is
 * rgba(0,0,0,0.7) over the cell fill, ~(75,75,75), and nothing else that dark
 * is anywhere near that big on CreateProfile.
 */

import { fail, pass } from "./lib/report.mjs";
import {
  boundingBox,
  captureScreen,
  groupRuns,
  rowsMatching,
} from "./lib/screen.mjs";

const TAG = "check-35";

// rgba(0,0,0,0.7) over the cell's near-white fill lands at ~(74,74,74). The
// lower bound matters: without it the largest "dark" region on an iPhone with
// a Dynamic Island is the island itself, at (0,0,0).
const isPillFill = ([r, g, b]) => {
  const max = Math.max(r, g, b);
  return max >= 45 && max <= 115 && max - Math.min(r, g, b) < 26;
};
const isLabel = ([r, g, b]) => Math.min(r, g, b) > 190;
const isButton = ([r, g, b]) => r - g >= 40 && r - b >= 15 && r >= 150;

/** Flood-fills the 4-connected component containing `start`, marking `seen`. */
const fillComponent = (screen, predicate, seen, start) => {
  const { width, height } = screen;
  const stack = [start];
  seen[start] = 1;

  let count = 0;
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  // Per-column extent of the fill, which is what tells the pill's inside from
  // the wedge of background that shows through inside its bounding box.
  const columnTop = new Int32Array(width).fill(-1);
  const columnBottom = new Int32Array(width).fill(-1);

  const visit = (index) => {
    const inBounds = index >= 0 && index < width * height && seen[index] === 0;
    if (!inBounds) return;

    const y = Math.floor(index / width);
    if (!predicate(screen.at(index - y * width, y))) return;

    seen[index] = 1;
    stack.push(index);
  };

  while (stack.length > 0) {
    const index = stack.pop();
    const y = Math.floor(index / width);
    const x = index - y * width;

    count += 1;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
    if (columnTop[x] === -1 || y < columnTop[x]) columnTop[x] = y;
    if (y > columnBottom[x]) columnBottom[x] = y;

    if (x > 0) visit(index - 1);
    if (x < width - 1) visit(index + 1);
    visit(index - width);
    visit(index + width);
  }

  return {
    count,
    x: minX,
    y: minY,
    right: maxX + 1,
    bottom: maxY + 1,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
    /** Is (x, y) strictly enclosed by the fill in its own column? */
    encloses: (x, y) =>
      columnTop[x] !== -1 && y > columnTop[x] && y < columnBottom[x],
  };
};

/** Largest 4-connected run of pixels matching `predicate`. */
const largestComponent = (screen, predicate) => {
  const { width, height } = screen;
  const seen = new Uint8Array(width * height);
  let best = null;

  const considerStart = (start, x, y) => {
    if (seen[start] !== 0 || !predicate(screen.at(x, y))) return;
    const component = fillComponent(screen, predicate, seen, start);
    if (!best || component.count > best.count) best = component;
  };

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      considerStart(y * width + x, x, y);
    }
  }

  return best;
};

const screen = captureScreen();
const pill = largestComponent(screen, isPillFill);

if (!pill || pill.count < 2000) {
  fail(
    TAG,
    "no MAESTRO_E2E_SKIP_PHOTO pill found. Is the build gated on EXPO_PUBLIC_MAESTRO_E2E=1 and parked on CreateProfile with empty slots?",
  );
}

console.log(
  `[${TAG}] pill ${pill.width}x${pill.height} at (${pill.x},${pill.y}), ${pill.count}px`,
);

if (pill.height > screen.height * 0.06) {
  fail(
    TAG,
    `the pill is ${pill.height}px tall (>6% of the screen) — it is not a one-line pill.`,
  );
}

// Only pixels the pill actually encloses. Its bounding box is a rectangle,
// but the photo cell it is pinned to has a rounded bottom-left corner and
// clips to it, so the page background shows through inside the box as a wedge
// that deepens row by row towards the pill's bottom edge. Those pixels are
// near-white, exactly like the label, and on a 2.625x Android display the
// wedge is wide enough to clear the 3-pixel row threshold for 19 rows — read
// as a second line of text, i.e. a wrap that is not there. Asking whether the
// pill continues BELOW a pixel in its own column separates the two without
// hard-coding a radius, a density or an inset.
const labelRuns = groupRuns(
  rowsMatching(
    screen,
    (pixel, x, y) => isLabel(pixel) && pill.encloses(x, y),
    pill,
    3,
  ),
  2,
);
if (labelRuns.length === 0) {
  fail(TAG, "found the pill but no label inside it.");
}

if (labelRuns.length > 1) {
  fail(
    TAG,
    `the label wraps onto ${labelRuns.length} lines (${labelRuns
      .map((run) => `${run.start}..${run.end}`)
      .join(", ")}). The cell clips everything past the first line.`,
  );
}

const button = boundingBox(screen, isButton, pill);
if (button) {
  fail(
    TAG,
    `the pink + button overlaps the pill (${button.count}px inside it, at ${button.x}..${button.right}). Inset the pill so the two do not share space.`,
  );
}

pass(
  TAG,
  `one-line label (rows ${labelRuns[0].start}..${labelRuns[0].end}), no button overlap`,
);
