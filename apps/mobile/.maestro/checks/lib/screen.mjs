/**
 * Zero-dependency screen sampling for the pixel post-checks.
 *
 * Two of the tour's findings are purely about where pixels land — an
 * "underline" that crosses the glyphs, a label that wraps and gets a button
 * dropped on top of it. Neither is expressible against an accessibility tree,
 * so those flows end parked on the screen under test and their check script
 * measures the real frame buffer.
 *
 * No ImageMagick, no Python, no npm dependency: `simctl` writes BMP directly
 * and BMP is a header plus raw rows, so the decoder below is ~30 lines and
 * runs anywhere Node does. That matters because these run on the same
 * macos-latest runner as the rest of the E2E job, with nothing installed.
 */

import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/** Decodes the uncompressed BMP variants `simctl io screenshot` emits. */
const decodeBmp = (buffer) => {
  if (buffer.readUInt16LE(0) !== 0x4d42) throw new Error("not a BMP file");

  const dataOffset = buffer.readUInt32LE(10);
  const width = buffer.readInt32LE(18);
  const rawHeight = buffer.readInt32LE(22);
  const bitsPerPixel = buffer.readUInt16LE(28);

  if (bitsPerPixel !== 24 && bitsPerPixel !== 32) {
    throw new Error(`unsupported BMP depth: ${bitsPerPixel}`);
  }

  const height = Math.abs(rawHeight);
  const topDown = rawHeight < 0;
  const bytesPerPixel = bitsPerPixel / 8;
  // Rows are padded to a 4-byte boundary.
  const stride = Math.ceil((width * bytesPerPixel) / 4) * 4;

  return {
    width,
    height,
    /** @returns {[number, number, number]} r, g, b at (x, y), y from the top. */
    at(x, y) {
      const row = topDown ? y : height - 1 - y;
      const offset = dataOffset + row * stride + x * bytesPerPixel;
      // BMP stores BGR(A).
      return [buffer[offset + 2], buffer[offset + 1], buffer[offset]];
    },
  };
};

/**
 * Android's `screencap` with no `-p` writes the raw framebuffer: three or four
 * 32-bit little-endian header words (width, height, pixel format, and a
 * colour-space word since Android 9) followed by RGBA rows.
 */
const decodeAndroidRaw = (buffer) => {
  const width = buffer.readUInt32LE(0);
  const height = buffer.readUInt32LE(4);
  const withColorSpace = buffer.length >= 16 + width * height * 4;
  const dataOffset = withColorSpace ? 16 : 12;

  return {
    width,
    height,
    at(x, y) {
      const offset = dataOffset + (y * width + x) * 4;
      return [buffer[offset], buffer[offset + 1], buffer[offset + 2]];
    },
  };
};

/**
 * Grabs the current screen of the booted device.
 *
 * @param {{ platform?: "ios" | "android", device?: string }} options
 */
export const captureScreen = ({
  platform = process.env.MAESTRO_PLATFORM ?? "ios",
  device = process.env.SIM_UDID ?? "booted",
} = {}) => {
  if (platform === "android") {
    const raw = execFileSync("adb", ["exec-out", "screencap"], {
      maxBuffer: 256 * 1024 * 1024,
    });
    return decodeAndroidRaw(raw);
  }

  const dir = mkdtempSync(join(tmpdir(), "maestro-check-"));
  const file = join(dir, "screen.bmp");
  try {
    // simctl narrates to stderr ("Note: No display specified…"); keep the
    // check's own output readable. A real failure still throws with the
    // captured stderr attached.
    execFileSync(
      "xcrun",
      ["simctl", "io", device, "screenshot", "--type=bmp", file],
      { stdio: ["ignore", "ignore", "pipe"] },
    );
    return decodeBmp(readFileSync(file));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
};

/** Bounding box of every pixel matching `predicate`, or null when there is none. */
export const boundingBox = (screen, predicate, region = {}) => {
  const x0 = region.x ?? 0;
  const y0 = region.y ?? 0;
  const x1 = region.right ?? screen.width;
  const y1 = region.bottom ?? screen.height;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let count = 0;

  for (let y = y0; y < y1; y += 1) {
    for (let x = x0; x < x1; x += 1) {
      if (predicate(screen.at(x, y))) {
        count += 1;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }

  if (count === 0) return null;
  return {
    x: minX,
    y: minY,
    right: maxX + 1,
    bottom: maxY + 1,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
    count,
  };
};

/** The y values inside `region` that hold at least `minCount` matching pixels. */
export const rowsMatching = (screen, predicate, region = {}, minCount = 1) => {
  const x0 = region.x ?? 0;
  const y0 = region.y ?? 0;
  const x1 = region.right ?? screen.width;
  const y1 = region.bottom ?? screen.height;

  const rows = [];
  for (let y = y0; y < y1; y += 1) {
    let count = 0;
    for (let x = x0; x < x1; x += 1) {
      if (predicate(screen.at(x, y))) count += 1;
    }
    if (count >= minCount) rows.push(y);
  }
  return rows;
};

/** Splits a sorted list of row indices into contiguous runs. */
export const groupRuns = (rows, maxGap = 1) => {
  const runs = [];
  for (const row of rows) {
    const last = runs.at(-1);
    if (last && row - last.end <= maxGap) {
      last.end = row;
    } else {
      runs.push({ start: row, end: row });
    }
  }
  return runs;
};
