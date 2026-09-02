import assert from "node:assert/strict";
import { test } from "node:test";

/**
 * The store is the blind spot in the share funnel: a tap leaves our origin,
 * spends time in Apple's or Google's app, and comes back as an install with no
 * memory of the dog card or the bio link that started it. These parameters are
 * the only thing that survives that hop, so a typo in one of them is a week of
 * attributed signups that silently reads zero.
 *
 * Imported as TypeScript on purpose. Node strips types on the versions this
 * repo pins (.nvmrc 22.23, CI `node-version: 22.x`), which keeps the URL
 * building in the module the route handler and the CTA actually import rather
 * than in a copy that can drift from it.
 */
const {
  APP_STORE_URL,
  PLAY_STORE_URL,
  WEBSITE_URL,
  landingPathFor,
  readCampaign,
  storeTargetForUserAgent,
  storeUrlFor,
} = await import("../src/app/store/store-urls.ts");

const REF = "cms9es4dr0001wbmv1a2b3c4d";

const IPHONE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
const ANDROID_UA =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36";
const DESKTOP_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

test("routes each user agent to its own store", () => {
  assert.equal(storeTargetForUserAgent(IPHONE_UA), "ios");
  assert.equal(storeTargetForUserAgent(ANDROID_UA), "android");
  assert.equal(storeTargetForUserAgent(DESKTOP_UA), "web");
  assert.equal(storeTargetForUserAgent(""), "web");
});

test("an App Store link carries the referrer as a campaign token", () => {
  const url = new URL(storeUrlFor({ target: "ios", campaign: { ref: REF } }));

  assert.equal(url.origin + url.pathname, APP_STORE_URL);
  assert.equal(url.searchParams.get("ct"), REF);
});

test("a Play link carries the referrer as an install referrer string", () => {
  // Google hands this through verbatim to the Install Referrer API, so the
  // encoding is the contract: one parameter whose value is itself a query
  // string.
  const url = storeUrlFor({ target: "android", campaign: { ref: REF } });

  assert.equal(
    url,
    `${PLAY_STORE_URL}&referrer=utm_source%3Dpegada%26utm_medium%3Dshare%26utm_content%3D${REF}`,
  );

  assert.equal(
    new URL(url).searchParams.get("referrer"),
    `utm_source=pegada&utm_medium=share&utm_content=${REF}`,
  );
});

test("incoming utm values win over the share defaults on Play", () => {
  // The bio link is a campaign in its own right, not a share, and the readout
  // has to be able to separate the two.
  const url = storeUrlFor({
    target: "android",
    campaign: {
      ref: "ig",
      utm_source: "instagram",
      utm_medium: "bio",
      utm_campaign: "launch",
    },
  });

  assert.equal(
    new URL(url).searchParams.get("referrer"),
    "utm_source=instagram&utm_medium=bio&utm_campaign=launch&utm_content=ig",
  );
});

test("a channel token is a valid referrer everywhere", () => {
  // `ref=ig` is the Instagram bio link. It is not a user id and must not be
  // dropped as if it were malformed.
  assert.equal(
    new URL(
      storeUrlFor({ target: "ios", campaign: { ref: "ig" } }),
    ).searchParams.get("ct"),
    "ig",
  );
  assert.equal(landingPathFor({ ref: "ig" }), "/?ref=ig");
});

test("the desktop fallback stays on this site and keeps the campaign", () => {
  // There is no install to send a desktop visitor to, and the landing page
  // already shows both store badges.
  assert.equal(
    storeUrlFor({ target: "web", campaign: { ref: REF } }),
    `${WEBSITE_URL}?ref=${REF}`,
  );

  assert.equal(landingPathFor({ ref: REF }), `/?ref=${REF}`);
  assert.equal(
    landingPathFor({ ref: "ig", utm_source: "instagram" }),
    "/?ref=ig&utm_source=instagram",
  );
  assert.equal(landingPathFor(), "/");
});

test("a link with no campaign is the link we shipped before", () => {
  for (const campaign of [undefined, {}, { ref: null }, { ref: "" }]) {
    assert.equal(storeUrlFor({ target: "ios", campaign }), APP_STORE_URL);
    assert.equal(storeUrlFor({ target: "android", campaign }), PLAY_STORE_URL);
    assert.equal(storeUrlFor({ target: "web", campaign }), WEBSITE_URL);
  }
});

test("a campaign value that could not have come from a link never reaches a store", () => {
  // These arrive from a query string anyone can edit, and they end up inside
  // Apple's and Google's analytics, not ours.
  for (const ref of [
    "a",
    "../../admin",
    `${REF}&pt=evil`,
    "a".repeat(33),
    "<script>alert(1)</script>",
    "utm_source=x&utm_medium=y",
  ]) {
    assert.equal(
      storeUrlFor({ target: "ios", campaign: { ref } }),
      APP_STORE_URL,
    );
    assert.equal(
      storeUrlFor({ target: "android", campaign: { ref } }),
      PLAY_STORE_URL,
    );
    assert.equal(
      storeUrlFor({ target: "web", campaign: { ref } }),
      WEBSITE_URL,
    );
  }
});

test("readCampaign takes only the four parameters, validated", () => {
  const params = new URLSearchParams(
    "ref=ig&utm_source=instagram&utm_medium=bio&utm_campaign=a b&other=keepout",
  );

  assert.deepEqual(readCampaign(params), {
    ref: "ig",
    utm_source: "instagram",
    utm_medium: "bio",
    // A space cannot appear in a value we generated, so it is dropped rather
    // than escaped into a store's campaign report.
    utm_campaign: undefined,
  });
});
