import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";

/**
 * The defect: the AASA claimed `/pt-br/dog/*` while the app had no route at
 * that path. Claiming a path is not a hint, it is a promise. iOS hands the
 * URL to the app instead of to Safari, and the app then had nothing to
 * render it with, so a Brazilian user tapping a shared link landed on
 * expo-router's "Unmatched Route" screen. That URL is not a curiosity:
 * next-intl runs `localePrefix: "as-needed"` and 307s an
 * `Accept-Language: pt-BR` browser from /dog/<id> to /pt-br/dog/<id>, so it
 * is the URL that ends up in the clipboard.
 *
 * Three files have to agree for a link to work, and they live in two apps
 * with nothing importing across the boundary (app.config.ts is loaded by
 * Expo's own config loader and cannot pull in Next's module graph), so they
 * are compared here as text. Any of them drifting, or a new locale being
 * added to the shared Language enum, fails this file.
 */

const repoRoot = path.join(import.meta.dirname, "..", "..", "..");
const MOBILE_APP_DIR = path.join(repoRoot, "apps", "mobile", "src", "app");

const read = (...segments) =>
  fs.readFileSync(path.join(repoRoot, ...segments), "utf8");

const aasaSource = read(
  "apps",
  "nextjs",
  "src",
  "app",
  ".well-known",
  "apple-app-site-association",
  "route.ts",
);
const appConfigSource = read("apps", "mobile", "app.config.ts");

/** The `"/": "<pattern>"` URL-component patterns the AASA claims. */
const claimedPatterns = [...aasaSource.matchAll(/"\/":\s*"([^"]+)"/g)].map(
  ([, pattern]) => pattern,
);

/**
 * Locale segments as the router spells them, derived from the same enum
 * apps/nextjs/src/lib/locales.ts derives LOCALE_SEGMENTS from. `Default`
 * aliases another member, hence the dedupe.
 */
const localeSegments = () => {
  const source = read("packages", "shared", "i18n", "types", "types.ts");
  const body = /export enum Language \{([^}]*)\}/.exec(source);
  assert.ok(body, "could not find the Language enum to read locales from");

  const members = [...body[1].matchAll(/(\w+)\s*=\s*"([^"]+)"/g)].map(
    ([, name, value]) => ({ name, segment: value.toLowerCase() }),
  );
  const fallback = members.find(({ name }) => name === "Default");
  assert.ok(fallback, "Language enum has no Default member");

  return {
    all: [...new Set(members.map(({ segment }) => segment))],
    // `localePrefix: "as-needed"` serves the default locale unprefixed and
    // redirects /<default>/... back to it, so it is never a shared URL.
    prefixed: [
      ...new Set(
        members
          .filter(({ segment }) => segment !== fallback.segment)
          .map(({ segment }) => segment),
      ),
    ],
  };
};

test("claims the unprefixed dog path and every non-default locale prefix", () => {
  const { prefixed } = localeSegments();

  assert.deepEqual(
    [...claimedPatterns].sort(),
    ["/dog/*", ...prefixed.map((segment) => `/${segment}/dog/*`)].sort(),
  );
});

test("every claimed path has an expo-router route to render it", () => {
  for (const pattern of claimedPatterns) {
    const route = path.join(
      MOBILE_APP_DIR,
      pattern.replace(/^\//, "").replace(/\/\*$/, ""),
      "[id].tsx",
    );

    assert.ok(
      fs.existsSync(route),
      `AASA claims ${pattern} but ${path.relative(repoRoot, route)} does not exist, so iOS would open the app onto the Unmatched Route screen`,
    );
  }
});

test("Android claims the same paths on every verified host", () => {
  const filters = /intentFilters: \[([\s\S]*?)\n {4}\],/.exec(appConfigSource);
  assert.ok(filters, "could not find the Android intentFilters block");

  const hosts = new Set(
    [...filters[1].matchAll(/host: "([^"]+)"/g)].map(([, host]) => host),
  );
  assert.ok(hosts.size > 0, "no verified hosts declared");

  const prefixes = [...filters[1].matchAll(/pathPrefix: "([^"]+)"/g)].map(
    ([, prefix]) => prefix,
  );

  for (const pattern of claimedPatterns) {
    const prefix = pattern.replace(/\/\*$/, "");
    const declared = prefixes.filter((candidate) => candidate === prefix);

    assert.equal(
      declared.length,
      hosts.size,
      `iOS claims ${pattern}, so every one of the ${hosts.size} Android hosts needs a "${prefix}" pathPrefix`,
    );
  }
});

test("declares the app for applinks and webcredentials", () => {
  assert.match(aasaSource, /appIDs: \[APPLE_APP_ID\]/);
  assert.match(aasaSource, /webcredentials: \{\s*apps: \[APPLE_APP_ID\]/);
  // Apple fetches this unauthenticated with no locale or user context, so
  // per-request rendering would only cost a cold start on the crawl.
  assert.match(aasaSource, /export const dynamic = "force-static"/);
});
