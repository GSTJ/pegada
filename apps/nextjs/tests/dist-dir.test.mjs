import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";

/**
 * The defect: two `next dev` processes out of one checkout share `.next` and
 * corrupt each other's chunk cache. Every tRPC call starts answering 500 with
 * `Cannot find module './vendor-chunks/zod.js'` and the app shows
 * "Oops - An error occurred while logging in." — which reads as an auth
 * regression, not as two servers fighting over a directory
 * (.unistyles-migration/verify-r1/MATRIX-GATE.md, "Capture flakes hit on the
 * way").
 */

const TSCONFIG = path.join(import.meta.dirname, "..", "tsconfig.json");

/**
 * Load the real config under a given environment, past the module cache.
 *
 * tsconfig.json is saved and restored around it: importing the config runs
 * next's plugin chain, which rewrites the file's `include` to point at
 * whatever build directory is in effect. Harmless when `next dev` does it,
 * not something a test should leave behind.
 */
const distDirFor = async (env) => {
  const previous = { ...process.env };
  const tsconfig = fs.readFileSync(TSCONFIG, "utf8");
  Object.assign(process.env, env);

  try {
    const config = await import(
      `../next.config.mjs?${Math.random().toString(36).slice(2)}`
    );

    return config.default.distDir;
  } finally {
    process.env = previous;
    fs.writeFileSync(TSCONFIG, tsconfig);
  }
};

test("two dev servers on different ports get different build directories", async () => {
  const first = await distDirFor({ NODE_ENV: "development", PORT: "3011" });
  const second = await distDirFor({ NODE_ENV: "development", PORT: "3012" });

  assert.equal(first, ".next-3011");
  assert.equal(second, ".next-3012");
  assert.notEqual(first, second);
});

test("the ordinary single dev server is unchanged", async () => {
  // undefined means "next's default", i.e. `.next`. Anything else here would
  // orphan every existing local build directory.
  assert.equal(
    await distDirFor({ NODE_ENV: "development", PORT: "3000" }),
    undefined,
  );
  assert.equal(
    await distDirFor({ NODE_ENV: "development", PORT: "" }),
    undefined,
  );
});

test("a production build is never redirected", async () => {
  // `next build` and `next start` have to agree on a directory, and PORT is
  // routinely set for one and not the other.
  assert.equal(
    await distDirFor({ NODE_ENV: "production", PORT: "3011" }),
    undefined,
  );
});
