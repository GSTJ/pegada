import { sortPlanPackages } from "./sort-packages";

const planPackage = (packageType: string, price: number) => ({
  packageType,
  product: { price },
});

const yearly = planPackage("ANNUAL", 49.99);
const monthly = planPackage("MONTHLY", 9.99);
const weekly = planPackage("WEEKLY", 4.99);

test("puts yearly first, then monthly, then weekly", () => {
  expect(sortPlanPackages([weekly, monthly, yearly])).toStrictEqual([
    yearly,
    monthly,
    weekly,
  ]);
  expect(sortPlanPackages([monthly, weekly, yearly])).toStrictEqual([
    yearly,
    monthly,
    weekly,
  ]);
});

test("keeps the offering's own list untouched", () => {
  const offered = [weekly, monthly, yearly];
  sortPlanPackages(offered);
  expect(offered).toStrictEqual([weekly, monthly, yearly]);
});

test("sends an unknown package type to the end, highest price first", () => {
  const lifetime = planPackage("LIFETIME", 199.99);
  const custom = planPackage("CUSTOM", 24.99);

  expect(
    sortPlanPackages([custom, weekly, lifetime, yearly, monthly]),
  ).toStrictEqual([yearly, monthly, weekly, lifetime, custom]);
});

test("orders an offering that only has two plans", () => {
  expect(sortPlanPackages([weekly, yearly])).toStrictEqual([yearly, weekly]);
  expect(sortPlanPackages([monthly, yearly])).toStrictEqual([yearly, monthly]);
  expect(sortPlanPackages([weekly, monthly])).toStrictEqual([monthly, weekly]);
});
