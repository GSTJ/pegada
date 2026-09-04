type SortablePlanPackage = {
  packageType: string;
  product: { price: number };
};

/**
 * Where each plan sits in the list. Yearly leads because it is the plan we
 * want picked, then monthly, then the weekly impulse plan. Anything the
 * offering adds later lands after the three we render on purpose.
 */
const PACKAGE_TYPE_ORDER: Record<string, number> = {
  ANNUAL: 0,
  MONTHLY: 1,
  WEEKLY: 2,
};

const UNRANKED = Object.keys(PACKAGE_TYPE_ORDER).length;

const rankOf = (packageType: string) =>
  PACKAGE_TYPE_ORDER[packageType] ?? UNRANKED;

/**
 * Orders the plan rows by billing period rather than by absolute price, so a
 * price change cannot silently reshuffle the list. Packages that share a rank,
 * including every unrecognised type, keep the previous rule of highest price
 * first. Returns a new array; the offering's own list is left untouched.
 */
export const sortPlanPackages = <T extends SortablePlanPackage>(
  packages: readonly T[],
): T[] =>
  [...packages].sort((a, b) => {
    const rankDifference = rankOf(a.packageType) - rankOf(b.packageType);

    if (rankDifference !== 0) return rankDifference;

    return b.product.price - a.product.price;
  });
