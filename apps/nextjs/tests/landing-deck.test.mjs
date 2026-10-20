import assert from "node:assert/strict";
import { test } from "node:test";

/**
 * The landing's deck promises the app's own swipe, so these are the app's
 * thresholds: a drift here is a deck that throws differently from the one
 * people install.
 */
const { cardTransform, feedbackOpacity, leanOf, releaseSwipe } =
  await import("../src/components/landing/deck-swipe.ts");

test("a slow drag commits only past 100px", () => {
  assert.equal(releaseSwipe(99, 0, 0, 0), undefined);
  assert.equal(releaseSwipe(101, 0, 0, 0), "like");
  assert.equal(releaseSwipe(-101, 0, 0, 0), "nope");
  assert.equal(releaseSwipe(0, -101, 0, 0), "maybe");
  assert.equal(releaseSwipe(0, 140, 0, 0), undefined);
});

test("a flick commits from 24px, only in the direction it moves", () => {
  assert.equal(releaseSwipe(30, 0, 0.2, 0), "like");
  assert.equal(releaseSwipe(-30, 0, -0.2, 0), "nope");
  assert.equal(releaseSwipe(30, 0, -0.2, 0), undefined);
  assert.equal(releaseSwipe(20, 0, 0.2, 0), undefined);
  assert.equal(releaseSwipe(0, -30, 0, -0.2), "maybe");
});

test("sideways wins over up", () => {
  assert.equal(releaseSwipe(120, -150, 0, 0), "like");
});

test("the card tilts 8deg per 100px", () => {
  assert.equal(cardTransform(50, -10), "translate(50px, -10px) rotate(4deg)");
});

test("the reaction fades in between 10px and 100px", () => {
  assert.deepEqual(feedbackOpacity(10, 0), { like: 0, nope: 0, maybe: 0 });
  assert.equal(feedbackOpacity(55, 0).like, 0.5);
  assert.equal(feedbackOpacity(400, 0).like, 1);
  assert.equal(feedbackOpacity(-100, 0).nope, 1);
  assert.equal(feedbackOpacity(0, -100).maybe, 1);
});

test("the lean names the answer, how far, and when it would commit", () => {
  assert.equal(leanOf(5, 0), undefined);
  assert.deepEqual(leanOf(50, -20), { dir: "like", amount: 0.5, armed: false });
  assert.deepEqual(leanOf(-10, -60), {
    dir: "maybe",
    amount: 0.6,
    armed: false,
  });
  assert.deepEqual(leanOf(-130, -160), { dir: "nope", amount: 1, armed: true });
});
