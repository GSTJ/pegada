import assert from "node:assert/strict";
import { test } from "node:test";

/**
 * The defect: visiting `/pt-br` once set `NEXT_LOCALE=pt-br`, and from then on
 * `/`, `/story` and the legal pages all 307'd to Portuguese. An English reader
 * who opened one shared Portuguese link had no way back.
 *
 * The segments are spelled out rather than read from `src/lib/locales.ts`,
 * which pulls in a TypeScript enum that `node --test` cannot strip.
 */
const { localeCookiePolicy } = await import("../src/lib/locale-cookie.ts");

const policy = (pathname, search) =>
  localeCookiePolicy(pathname, "en-us", ["en-us", "pt-br"], search);

test("a shared Portuguese link neither pins nor clears the cookie", () => {
  for (const path of [
    "/pt-br",
    "/pt-br/",
    "/pt-br/story",
    "/PT-BR/terms-of-use",
  ]) {
    assert.equal(policy(path), "ignore", path);
    assert.equal(policy(path, "?ref=ig"), "ignore", path);
  }
});

test("choosing Portuguese in the switch sticks", () => {
  for (const path of ["/pt-br", "/pt-br/story"]) {
    assert.equal(policy(path, "?lang"), "choose", path);
  }
  assert.equal(policy("/story", "?lang"), "ignore");
});

test("choosing English in the switch sticks", () => {
  for (const path of ["/en-us", "/en-us/privacy-policy"]) {
    assert.equal(policy(path), "persist", path);
  }
});

test("unprefixed URLs leave the visitor's choice alone", () => {
  for (const path of ["/", "/story", "/privacy-policy", "/pt-brasil"]) {
    assert.equal(policy(path), "ignore", path);
  }
});
