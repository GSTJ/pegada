import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

/**
 * Answer engines read these two files instead of crawling the site, so the
 * test holds the shape they rely on: the llmstxt.org layout, only URLs the
 * sitemap already lists, nothing noindexed, and full text with no template
 * leftovers.
 *
 * Imported as TypeScript on purpose (see store-urls.test.mjs): the builders
 * are the same functions the route handlers call.
 */
const { buildLlmsFullTxt, buildLlmsTxt } = await import("../src/lib/llms.ts");
const { default: sitemap } = await import("../src/app/sitemap.ts");

const { APP_STORE_URL, PLAY_STORE_URL } =
  await import("../src/app/store/store-urls.ts");

const web = (locale) =>
  JSON.parse(
    readFileSync(
      new URL(
        `../../../packages/shared/i18n/locales/${locale}/web.json`,
        import.meta.url,
      ),
      "utf8",
    ),
  );
const resources = { "en-us": web("en"), "pt-br": web("pt-BR") };

const llms = buildLlmsTxt(resources, {
  appStore: APP_STORE_URL,
  playStore: PLAY_STORE_URL,
});
const full = buildLlmsFullTxt(resources);

const urls = llms.match(/\]\((\S+?)\)/g).map((m) => m.slice(2, -1));

test("llms.txt opens with the Pegada heading and a summary", () => {
  assert.ok(llms.startsWith("# Pegada\n\n> "));
});

test("every llms.txt link is a sitemap page or a store link", () => {
  const known = new Set([
    ...sitemap().map((entry) => entry.url),
    APP_STORE_URL,
    PLAY_STORE_URL,
  ]);

  assert.ok(urls.length > 0);
  for (const url of urls) assert.ok(known.has(url), `${url} is not known`);
});

test("llms.txt links the indexable pages and not the noindexed ones", () => {
  const linked = new Set(urls);
  assert.ok(linked.has("https://www.pegada.app/"));
  assert.ok(linked.has("https://www.pegada.app/pt-br/privacy-policy"));
  for (const url of urls)
    assert.doesNotMatch(url, /terms-of-use|delete-account/);
});

test("llms-full.txt carries both locales with no placeholders or HTML", () => {
  assert.match(full, /## English/);
  assert.match(full, /## Português/);
  assert.match(full, /Find your dog a friend nearby/);
  assert.match(full, /Política de Privacidade|política de privacidade/i);
  assert.doesNotMatch(full, /\{\{|<\/?[a-z]+>/i);
});
