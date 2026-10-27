import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

/**
 * robots and sitemap are pure, so they are imported as TypeScript (same as
 * store-urls.test.mjs). The page metadata pulls in request-bound i18n, so the
 * noindex pages are checked from their source instead.
 */
const { default: robots } = await import("../src/app/robots.ts");
const { default: sitemap } = await import("../src/app/sitemap.ts");

const NOINDEX_PAGES = ["terms-of-use", "delete-account"];

const source = (page) =>
  readFileSync(
    new URL(`../src/app/[locale]/${page}/page.tsx`, import.meta.url),
    "utf8",
  );

test("robots allows exactly the listed AI crawlers and keeps the sitemap", () => {
  const { rules, sitemap: sitemapUrl } = robots();

  assert.deepEqual(
    rules.map((rule) => rule.userAgent),
    [
      "*",
      "GPTBot",
      "OAI-SearchBot",
      "ChatGPT-User",
      "ClaudeBot",
      "Claude-User",
      "Claude-SearchBot",
      "PerplexityBot",
      "Perplexity-User",
      "Google-Extended",
      "Applebot-Extended",
      "Bingbot",
      "CCBot",
    ],
  );
  assert.equal(rules[0].disallow, "/api/");
  for (const rule of rules) assert.equal(rule.allow, "/");
  assert.equal(sitemapUrl, "https://www.pegada.app/sitemap.xml");
});

test("sitemap leaves out noindex pages and carries no lastmod", () => {
  const entries = sitemap();

  assert.ok(entries.length > 0);
  for (const entry of entries) {
    for (const page of NOINDEX_PAGES) {
      assert.ok(!entry.url.includes(page), `${entry.url} is noindex`);
    }
    assert.equal(entry.lastModified, undefined);
  }
  assert.ok(entries.some((entry) => entry.url.endsWith("/privacy-policy")));
});

test("secondary legal pages are noindex and the privacy policy is not", () => {
  for (const page of NOINDEX_PAGES) {
    assert.match(source(page), /noindex: true/);
  }
  assert.doesNotMatch(source("privacy-policy"), /noindex/);
});
