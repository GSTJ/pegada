/* oxlint-disable no-await-in-loop -- Each case temporarily replaces global fetch; run them serially. */
import assert from "node:assert/strict";
import { test } from "node:test";

import sharp from "sharp";

import { loadOgPhoto } from "../src/lib/og-photo.ts";

test("normalizes WebP and AVIF photos for Satori", async (t) => {
  for (const format of ["webp", "avif"]) {
    const bytes = await sharp({
      create: { width: 32, height: 32, channels: 3, background: "pink" },
    })
      .toFormat(format)
      .toBuffer();
    t.mock.method(globalThis, "fetch", () =>
      Promise.resolve(new Response(bytes)),
    );
    const uri = await loadOgPhoto("https://example.test/dog", 420, 478);
    const result = await sharp(
      Buffer.from(uri.split(",")[1], "base64"),
    ).metadata();
    assert.equal(result.format, "png");
    assert.equal(result.width, 420);
    assert.equal(result.height, 478);
    t.mock.restoreAll();
  }
});

test("falls back for failed, invalid and oversized photos", async (t) => {
  for (const response of [
    new Response(null, { status: 404 }),
    new Response("invalid image"),
    new Response("x", {
      headers: { "content-length": String(9 * 1024 * 1024) },
    }),
    new Response(new Uint8Array(9 * 1024 * 1024)),
  ]) {
    t.mock.method(globalThis, "fetch", () => Promise.resolve(response));
    assert.equal(
      await loadOgPhoto("https://example.test/dog", 420, 478),
      undefined,
    );
    t.mock.restoreAll();
  }
});
