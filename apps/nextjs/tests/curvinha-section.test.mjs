import assert from "node:assert/strict";
import { test } from "node:test";

const { CURVINHA_APP_STORE_URL, CURVINHA_SITE_URL } =
  await import("../src/components/landing/curvinha-urls.ts");

test("the App Store link carries the campaign for this site", () => {
  assert.equal(
    CURVINHA_APP_STORE_URL,
    "https://apps.apple.com/br/app/id6816957870?pt=126480814&ct=pegada-site",
  );
});

test("the curvinha.app link is the plain backlink, with no UTM", () => {
  assert.equal(CURVINHA_SITE_URL, "https://curvinha.app/");
  assert.equal(new URL(CURVINHA_SITE_URL).search, "");
});
