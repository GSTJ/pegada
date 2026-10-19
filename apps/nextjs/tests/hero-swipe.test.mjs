import assert from "node:assert/strict";
import { test } from "node:test";

/**
 * The hero deck promises the app's own swipe. These are the app's thresholds
 * (`apps/mobile/src/constants.ts`), so a drift here is a deck that throws
 * differently from the one people install.
 */
const { feedbackOpacity, swipeKind } =
  await import("../src/components/landing/hero-swipe.ts");

test("a slow drag commits only past 100px", () => {
  assert.equal(swipeKind(99, 0, 0, 0), undefined);
  assert.equal(swipeKind(101, 0, 0, 0), "like");
  assert.equal(swipeKind(-101, 0, 0, 0), "nope");
  assert.equal(swipeKind(0, -101, 0, 0), "maybe");
  assert.equal(swipeKind(0, 140, 0, 0), undefined);
});

test("a flick faster than 1000px/s commits from any distance", () => {
  assert.equal(swipeKind(30, 0, 1.2, 0), "like");
  assert.equal(swipeKind(-30, 0, -1.2, 0), "nope");
  assert.equal(swipeKind(0, -20, 0, -1.2), "maybe");
});

test("sideways wins over up, like the app", () => {
  assert.equal(swipeKind(120, -150, 0, 0), "like");
});

test("the reaction fades in between 10px and 100px", () => {
  assert.deepEqual(feedbackOpacity(10, 0), { like: 0, nope: 0, maybe: 0 });
  assert.equal(feedbackOpacity(55, 0).like, 0.5);
  assert.equal(feedbackOpacity(400, 0).like, 1);
  assert.equal(feedbackOpacity(-100, 0).nope, 1);
  assert.equal(feedbackOpacity(0, -100).maybe, 1);
});
