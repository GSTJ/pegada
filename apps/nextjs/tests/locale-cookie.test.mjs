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

const policy = (pathname) =>
  localeCookiePolicy(pathname, "en-us", ["en-us", "pt-br"]);

test("a Portuguese visit never pins the cookie to Portuguese", () => {
  for (const path of [
    "/pt-br",
    "/pt-br/",
    "/pt-br/story",
    "/PT-BR/terms-of-use",
  ]) {
    assert.equal(policy(path), "clear", path);
  }
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
