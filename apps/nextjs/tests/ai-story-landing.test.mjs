import assert from "node:assert/strict";
import { test } from "node:test";

/**
 * The AI story page is an experiment, and its whole output is a conversion
 * rate split by channel. Two things decide whether that number is readable:
 * the property names PostHog stores an insight against, and what the page
 * makes of the query string it was opened with.
 *
 * Both are pure functions, imported straight from the TypeScript source, which
 * Node strips the types out of. Neither module reaches for the database or the
 * request, so there is nothing to stand up first.
 */
const analytics = await import("../src/services/analytics.ts");
const attribution = await import("../src/app/[locale]/story/attribution.ts");

test("the event properties are the snake_case ones PostHog gets", () => {
  assert.deepEqual(
    analytics.aiStoryProperties({
      locale: "pt-br",
      ref: "instagram-bio",
      utmCampaign: "story-fake-door",
      utmMedium: "social",
      utmSource: "instagram",
    }),
    {
      locale: "pt-br",
      ref: "instagram-bio",
      utm_campaign: "story-fake-door",
      utm_medium: "social",
      utm_source: "instagram",
    },
  );
});

test("a direct visit reports its locale and nothing else", () => {
  // An explicit null is a value PostHog stores and shows in a breakdown, so
  // every direct visit would otherwise form a "null" row next to the campaigns.
  assert.deepEqual(analytics.aiStoryProperties({ locale: "en-us" }), {
    locale: "en-us",
  });
});

test("a query string is read into the four attribution fields", () => {
  assert.deepEqual(
    attribution.readAttribution({
      ref: "newsletter",
      utm_campaign: "launch",
      utm_medium: "email",
      utm_source: "substack",
      unrelated: "ignored",
    }),
    {
      ref: "newsletter",
      utmCampaign: "launch",
      utmMedium: "email",
      utmSource: "substack",
    },
  );
});

test("an empty or missing parameter is undefined, not an empty string", () => {
  assert.equal(attribution.toAttributionValue(undefined), undefined);
  assert.equal(attribution.toAttributionValue(""), undefined);
  assert.equal(attribution.toAttributionValue("   "), undefined);
});

test("a repeated parameter keeps the first value", () => {
  assert.equal(
    attribution.toAttributionValue(["instagram", "tiktok"]),
    "instagram",
  );
});

test("a parameter is trimmed and capped before it is written down", () => {
  assert.equal(attribution.toAttributionValue("  instagram  "), "instagram");

  const long = "x".repeat(attribution.MAX_ATTRIBUTION_LENGTH + 50);

  assert.equal(
    attribution.toAttributionValue(long).length,
    attribution.MAX_ATTRIBUTION_LENGTH,
  );
});
