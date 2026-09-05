import assert from "node:assert/strict";
import { globSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { test } from "node:test";

import nextConfig from "../next.config.mjs";

const { OG_FONT_PATHS, OG_LOGO_PATH, getOgAssets } =
  await import("../src/lib/og-assets.ts");

/**
 * The defect: the dog card's OG image answered
 * `ENOENT: no such file or directory, open
 * '/var/task/packages/shared/themes/fonts/Gilroy-Medium.ttf'` in production.
 * The route reads Gilroy and `public/logo.svg` with `node:fs` at paths built
 * from `process.cwd()`, which the bundler cannot see, so the files only reach
 * the deployed function because `outputFileTracingIncludes` names them. Remove
 * that config entry and `next build` still passes, the route's `.nft.json`
 * quietly loses every font, and every share of a dog loses its link preview.
 *
 * So the config entry is load-bearing and nothing else checks it. Below: the
 * files are readable, the include globs cover every one of them, and the key
 * still matches the routes that need them, matched the way Next matches it
 * (`picomatch`, `contains: true`, against `normalizeAppPath` of the entry).
 */
const require = createRequire(import.meta.url);
const picomatch = require("next/dist/compiled/picomatch");
const {
  normalizeAppPath,
} = require("next/dist/shared/lib/router/utils/app-paths");

const APP_DIR = path.join(import.meta.dirname, "..", "src", "app");

/** Next's metadata image conventions, the ones that render through satori. */
const IMAGE_ROUTE_FILES = "**/{opengraph,twitter}-image.tsx";

const includes = nextConfig.outputFileTracingIncludes;

/** The routes Next builds for the image files that exist in the app today. */
const imageRoutes = globSync(IMAGE_ROUTE_FILES, { cwd: APP_DIR }).map((file) =>
  normalizeAppPath(`app/${path.dirname(file)}/${path.parse(file).name}/route`),
);

test("the app has image routes to trace assets for", () => {
  assert.ok(
    imageRoutes.length > 0,
    `no ${IMAGE_ROUTE_FILES} under src/app, so this file is checking nothing`,
  );
});

test("every image route is covered by an include key", () => {
  for (const route of imageRoutes) {
    const matched = Object.keys(includes).filter((key) =>
      picomatch(key, { dot: true, contains: true })(route),
    );

    assert.ok(
      matched.length > 0,
      `${route} matches no outputFileTracingIncludes key, so it deploys without its fonts`,
    );
  }
});

test("the include globs resolve to every file the route reads", () => {
  const globs = Object.values(includes).flat();
  const traced = new Set(
    globs.flatMap((pattern) =>
      globSync(pattern, { cwd: path.join(import.meta.dirname, "..") }).map(
        (file) => path.resolve(import.meta.dirname, "..", file),
      ),
    ),
  );

  for (const file of [...OG_FONT_PATHS, OG_LOGO_PATH]) {
    assert.ok(
      traced.has(path.resolve(file)),
      `${path.basename(file)} is read at runtime but no include glob resolves to it`,
    );
  }
});

test("the assets read back as fonts and a logo", async () => {
  const { fonts, logoDataUri } = await getOgAssets();

  assert.equal(fonts?.length, OG_FONT_PATHS.length);

  for (const font of fonts ?? []) {
    assert.equal(font.name, "Gilroy");
    // 0x00010000 is the TrueType version tag every one of these files opens
    // with: a truncated or missing file gets past a length check, not this.
    assert.deepEqual(
      Buffer.from(font.data.subarray(0, 4)),
      Buffer.from([0x00, 0x01, 0x00, 0x00]),
      `${font.weight} is not a TrueType file`,
    );
  }

  assert.match(
    logoDataUri ?? "",
    /^data:image\/svg\+xml;base64,[A-Za-z0-9+/]+/,
  );
});
