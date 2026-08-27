/**
 * Reads the device's view hierarchy through `maestro hierarchy`.
 *
 * `assertVisible: { above: ... }` compares two elements' TOP edges and nothing
 * else, so it cannot say "this field's bottom edge clears the bar painted over
 * the scroll area" — the exact statement one of the tour's findings is about.
 * The hierarchy dump carries real bounds, in points, for every node Maestro can
 * see, on both platforms. A post-check can therefore assert the geometry the
 * selector language cannot express, without leaving testID-land for pixels.
 */

import { execFileSync } from "node:child_process";

/** `[x1,y1][x2,y2]` -> a rect. */
const parseBounds = (bounds) => {
  const match = /\[(-?\d+),(-?\d+)]\[(-?\d+),(-?\d+)]/.exec(bounds ?? "");
  if (!match) return null;

  const [x, y, right, bottom] = match.slice(1).map(Number);
  return { x, y, right, bottom, width: right - x, height: bottom - y };
};

/**
 * Every node carrying a testID, keyed by it. Later nodes win, which matches
 * Maestro's own "deepest match" behaviour for duplicated ids.
 *
 * @returns {Map<string, {x:number,y:number,right:number,bottom:number,width:number,height:number}>}
 */
export const readHierarchy = ({
  device = process.env.MAESTRO_DEVICE_ID ?? process.env.SIM_UDID,
} = {}) => {
  const args = device ? ["--device", device, "hierarchy"] : ["hierarchy"];
  const raw = execFileSync("maestro", args, {
    maxBuffer: 64 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  }).toString();

  // `maestro hierarchy` prefixes the JSON with its own banner lines on some
  // versions; start at the first brace.
  const tree = JSON.parse(raw.slice(raw.indexOf("{")));

  const byTestId = new Map();
  let screen = null;

  const walk = (node) => {
    const attributes = node.attributes ?? {};
    const bounds = parseBounds(attributes.bounds);

    // The first non-degenerate rect in a pre-order walk is the app window.
    // Not "the tallest": a ScrollView's content view is taller than the
    // screen, and using it would make any bound expressed as a fraction of
    // the screen meaningless.
    if (!screen && bounds && bounds.width > 0 && bounds.height > 0) {
      screen = bounds;
    }
    if (bounds && attributes["resource-id"]) {
      byTestId.set(attributes["resource-id"], bounds);
    }

    for (const child of node.children ?? []) walk(child);
  };

  walk(tree);

  // On Android the dump is not one window: SystemUI's status bar is in there
  // too, and in a pre-order walk it comes FIRST — so the heuristic above picks
  // a 1080x74 strip as "the screen" and every check expressed as a fraction of
  // it silently inverts. The window manager knows the real display size, so
  // ask it instead of guessing from the tree.
  if ((process.env.MAESTRO_PLATFORM ?? "ios").toLowerCase() === "android") {
    const size = execFileSync("adb", ["shell", "wm", "size"], {
      stdio: ["ignore", "pipe", "pipe"],
    }).toString();
    // "Override size:" wins when present — that is the size actually rendered.
    const match = [
      ...size.matchAll(/(?:Physical|Override) size:\s*(\d+)x(\d+)/g),
    ].at(-1);
    if (match) {
      const [width, height] = [Number(match[1]), Number(match[2])];
      screen = { x: 0, y: 0, right: width, bottom: height, width, height };
    }
  }

  return { byTestId, screen: screen ?? { width: 0, height: 0 } };
};
