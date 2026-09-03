import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { test } from "node:test";

import nextConfig from "../next.config.mjs";

/**
 * The defect: `pegada.app` sends every path to `www.pegada.app` with a 308.
 * Apple's `swcd` fetches
 * `https://pegada.app/.well-known/apple-app-site-association` when the app
 * is installed and does not follow redirects, and Android's domain verifier
 * treats `assetlinks.json` the same way, so the apex association never
 * installs. `apps/mobile/app.config.ts` declares `applinks:pegada.app`, so
 * that is half the universal links quietly opening in a browser.
 *
 * What is asserted here is the matching, not the wording: the source is
 * compiled with the same library Next compiles `redirects` sources with, so
 * a rewrite of that pattern that starts swallowing `/.well-known` fails
 * here rather than on a store install. If Next moves this module the import
 * throws, and the fix is to point it at the new path, not to weaken the
 * assertions.
 */
const { pathToRegexp, compile } = createRequire(import.meta.url)(
  "next/dist/compiled/path-to-regexp",
);

const redirects = await nextConfig.redirects();

const apexRedirect = redirects.find((redirect) =>
  redirect.has?.some(
    (condition) =>
      condition.type === "host" && condition.value === "pegada.app",
  ),
);

test("the apex has a redirect to the canonical www host", () => {
  assert.ok(
    apexRedirect,
    "no redirect is conditioned on the pegada.app host, so the apex would serve the site on a second canonical origin",
  );
  // 308, which is what search engines and the App Store listing expect from
  // a host that has moved for good.
  assert.equal(apexRedirect.permanent, true);
});

test("the well-known files stay on the apex", () => {
  const matches = pathToRegexp(apexRedirect.source);

  for (const path of [
    "/.well-known/apple-app-site-association",
    "/.well-known/assetlinks.json",
  ]) {
    assert.equal(
      matches.test(path),
      false,
      `${path} would be redirected, and neither Apple nor Android follows a redirect when installing an app link association`,
    );
  }
});

test("every other apex path still goes to www", () => {
  const matches = pathToRegexp(apexRedirect.source);

  for (const path of [
    "/",
    "/dog/abc",
    "/pt-br/dog/abc",
    "/store",
    "/privacy-policy",
  ]) {
    assert.equal(matches.test(path), true, `${path} would stay on the apex`);
  }
});

test("the path is carried over to the destination", () => {
  // Next splits the origin off an absolute destination before compiling the
  // rest, because a bare `compile` reads the `https:` scheme as a parameter
  // with no name and throws. Same split here, same result.
  const destination = new URL(apexRedirect.destination);
  assert.equal(destination.origin, "https://www.pegada.app");

  // `validate: false` is what Next passes in `prepareDestination`. Without
  // it the default single-segment pattern rejects the slashes in a path
  // like `dog/abc`, which the server itself substitutes happily.
  const buildPath = compile(destination.pathname, { validate: false });

  assert.equal(buildPath({ path: "dog/abc" }), "/dog/abc");
  assert.equal(buildPath({ path: "" }), "/");
});
