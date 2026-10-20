import assert from "node:assert/strict";
import { test } from "node:test";

/**
 * The radius map draws every dog and ring from `ringOf`, and the count under
 * the slider comes from `inRadius`, so these pin where things sit and who is
 * in.
 */
const { inRadius, ringOf, sweepValue } =
  await import("../src/components/landing/radius-scale.ts");

const round = (value) => Math.round(value * 1000) / 1000;

test("the rings and dots sit where the map draws them", () => {
  assert.equal(ringOf(300), 1);
  assert.equal(round(ringOf(10)), 0.42);
  assert.equal(round(ringOf(50)), 0.689);
  assert.equal(round(ringOf(3)), 0.243);
  assert.equal(round(ringOf(12)), 0.449);
  assert.equal(round(ringOf(246)), 0.965);
});

test("a dog is in when it is within the radius, and 300 has no limit", () => {
  assert.equal(inRadius(50, 3), true);
  assert.equal(inRadius(50, 246), false);
  assert.equal(inRadius(250, 246), true);
  assert.equal(inRadius(300, 5000), true);
  assert.equal(inRadius(0, 1), true);
  assert.equal(inRadius(0, 3), false);
});

test("the scroll sweep runs from 300 to 10 in steps of 5, Maui out before Bento", () => {
  assert.equal(sweepValue(0), 300);
  assert.equal(sweepValue(1), 10);
  assert.equal(sweepValue(-1), 300);
  assert.equal(sweepValue(2), 10);
  const firstOut = (km) => {
    for (let i = 0; i <= 100; i++) {
      if (!inRadius(sweepValue(i / 100), km)) return i;
    }
  };
  const mauiOut = firstOut(246);
  const bentoOut = firstOut(12);
  assert.ok(mauiOut > 15 && mauiOut < 40, `Maui out at ${mauiOut}%`);
  assert.ok(bentoOut > 70 && bentoOut < 90, `Bento out at ${bentoOut}%`);
  assert.ok(inRadius(sweepValue(1), 3));
  assert.equal(sweepValue(0.5) % 5, 0);
  assert.ok(sweepValue(0.25) > sweepValue(0.75));
});
