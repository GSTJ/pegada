import { getYearlySavingPercent } from "./saving-percent";

test("rounds the yearly saving down so the badge never overstates", () => {
  // 9.99 x 12 = 119.88, saving 58.31% against 49.99.
  expect(
    getYearlySavingPercent({
      monthlyPrice: 9.99,
      weeklyPrice: undefined,
      yearlyPrice: 49.99,
    }),
  ).toBe(58);
  // 10 x 12 = 120, saving 58.33% against 50.
  expect(
    getYearlySavingPercent({
      monthlyPrice: 10,
      weeklyPrice: undefined,
      yearlyPrice: 50,
    }),
  ).toBe(58);
  expect(
    getYearlySavingPercent({
      monthlyPrice: 10,
      weeklyPrice: undefined,
      yearlyPrice: 60,
    }),
  ).toBe(50);
});

test("falls back to a year of weekly charges when there is no monthly plan", () => {
  // 4.99 x 52 = 259.48, saving 80.73% against 49.99.
  expect(
    getYearlySavingPercent({
      monthlyPrice: undefined,
      weeklyPrice: 4.99,
      yearlyPrice: 49.99,
    }),
  ).toBe(80);
  // 5 x 52 = 260, saving 50% against 130.
  expect(
    getYearlySavingPercent({
      monthlyPrice: undefined,
      weeklyPrice: 5,
      yearlyPrice: 130,
    }),
  ).toBe(50);
});

test("compares against the monthly plan when the offering has both", () => {
  // 10 x 12 = 120 rather than 5 x 52 = 260, so the badge reads 50 not 76.
  expect(
    getYearlySavingPercent({
      monthlyPrice: 10,
      weeklyPrice: 5,
      yearlyPrice: 60,
    }),
  ).toBe(50);
});

test("hides the badge when there is nothing to save", () => {
  expect(
    getYearlySavingPercent({
      monthlyPrice: 10,
      weeklyPrice: undefined,
      yearlyPrice: 120,
    }),
  ).toBeUndefined();
  expect(
    getYearlySavingPercent({
      monthlyPrice: 10,
      weeklyPrice: undefined,
      yearlyPrice: 130,
    }),
  ).toBeUndefined();
  expect(
    getYearlySavingPercent({
      monthlyPrice: undefined,
      weeklyPrice: 2,
      yearlyPrice: 104,
    }),
  ).toBeUndefined();
  expect(
    getYearlySavingPercent({
      monthlyPrice: 0,
      weeklyPrice: undefined,
      yearlyPrice: 50,
    }),
  ).toBeUndefined();
  expect(
    getYearlySavingPercent({
      monthlyPrice: undefined,
      weeklyPrice: undefined,
      yearlyPrice: 50,
    }),
  ).toBeUndefined();
  expect(
    getYearlySavingPercent({
      monthlyPrice: 10,
      weeklyPrice: undefined,
      yearlyPrice: undefined,
    }),
  ).toBeUndefined();
});
