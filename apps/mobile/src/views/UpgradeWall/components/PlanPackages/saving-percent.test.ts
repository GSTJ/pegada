import { getYearlySavingPercent } from "./saving-percent";

test("rounds the yearly saving down so the badge never overstates", () => {
  // 9.99 x 12 = 119.88, saving 58.31% against 49.99.
  expect(getYearlySavingPercent(9.99, 49.99)).toBe(58);
  // 10 x 12 = 120, saving 58.33% against 50.
  expect(getYearlySavingPercent(10, 50)).toBe(58);
  expect(getYearlySavingPercent(10, 60)).toBe(50);
});

test("hides the badge when there is nothing to save", () => {
  expect(getYearlySavingPercent(10, 120)).toBeUndefined();
  expect(getYearlySavingPercent(10, 130)).toBeUndefined();
  expect(getYearlySavingPercent(0, 50)).toBeUndefined();
  expect(getYearlySavingPercent(undefined, 50)).toBeUndefined();
  expect(getYearlySavingPercent(10, undefined)).toBeUndefined();
});
