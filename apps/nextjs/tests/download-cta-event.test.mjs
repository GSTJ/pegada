import assert from "node:assert/strict";
import { test } from "node:test";

/**
 * The download CTA event is the only number that answers "does the share page
 * actually send anyone to a store". Its name and its property keys are what a
 * PostHog insight is saved against, so renaming either one silently breaks a
 * chart nobody is watching at the time.
 *
 * Imported straight from the TypeScript source: Node strips the types, and
 * this module deliberately depends on nothing but `magic-observability/web`.
 */
const analytics = await import("../src/services/analytics.ts");

test("the event name is the one the insight is saved against", () => {
  assert.equal(analytics.DOWNLOAD_CTA_CLICKED, "Download CTA Clicked");
});

test("a landing page click reports page, placement and store", () => {
  assert.deepEqual(
    analytics.downloadCtaProperties({
      page: "landing",
      placement: "hero",
      store: "app_store",
    }),
    { page: "landing", placement: "hero", store: "app_store" },
  );
});

test("a share page click carries the dog it came from", () => {
  assert.deepEqual(
    analytics.downloadCtaProperties({
      page: "dog_share",
      placement: "mobile_sticky_bar",
      store: "auto",
      dogId: "dog_123",
    }),
    {
      page: "dog_share",
      placement: "mobile_sticky_bar",
      store: "auto",
      dog_id: "dog_123",
    },
  );
});

test("dog_id is absent rather than null when there is no dog", () => {
  // An explicit null is a value PostHog stores and shows in a breakdown,
  // which would put a "null" row next to the real dog ids.
  assert.equal(
    "dog_id" in
      analytics.downloadCtaProperties({
        page: "landing",
        placement: "hero",
        store: "play_store",
      }),
    false,
  );
});

test("capturing without a PostHog key is silent, not a crash", (t) => {
  // Production has no NEXT_PUBLIC_POSTHOG_KEY yet, so this is the path every
  // real click takes until it is set: the shared client is the no-op one and
  // a capture has to cost nothing and say nothing.
  const error = t.mock.method(console, "error", () => {});
  const warn = t.mock.method(console, "warn", () => {});

  analytics.trackDownloadCtaClicked({
    page: "dog_share",
    placement: "desktop_copy",
    store: "auto",
    dogId: "dog_123",
  });

  assert.equal(error.mock.callCount(), 0);
  assert.equal(warn.mock.callCount(), 0);
});
