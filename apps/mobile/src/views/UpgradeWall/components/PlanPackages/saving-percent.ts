const MONTHS_IN_A_YEAR = 12;
const WEEKS_IN_A_YEAR = 52;

/**
 * What a year of paying as you go costs. Monthly wins when the offering has
 * both, because it is the plan a buyer is most likely weighing the year up
 * against.
 */
const getPayAsYouGoYear = (
  monthlyPrice: number | undefined,
  weeklyPrice: number | undefined,
) => {
  if (monthlyPrice !== undefined) return monthlyPrice * MONTHS_IN_A_YEAR;
  if (weeklyPrice !== undefined) return weeklyPrice * WEEKS_IN_A_YEAR;

  return undefined;
};

type YearlySavingPrices = {
  /** Preferred comparison base: what a year of monthly charges would cost. */
  monthlyPrice: number | undefined;
  /** Fallback base for offerings that ship yearly and weekly but no monthly. */
  weeklyPrice: number | undefined;
  yearlyPrice: number | undefined;
};

/**
 * Percent saved by paying a year up front instead of paying as you go.
 * The monthly plan is the comparison base whenever the offering has one, and
 * the weekly plan stands in when it does not, so the badge still appears on a
 * yearly plus weekly ladder.
 * Rounded down so the badge never promises more than the plans deliver.
 * Returns undefined when there is no base price, no yearly price, or the
 * yearly plan is not actually cheaper, in which case no badge should be shown.
 */
export const getYearlySavingPercent = ({
  monthlyPrice,
  weeklyPrice,
  yearlyPrice,
}: YearlySavingPrices) => {
  if (yearlyPrice === undefined) return;

  const payAsYouGoYear = getPayAsYouGoYear(monthlyPrice, weeklyPrice);

  if (payAsYouGoYear === undefined || payAsYouGoYear <= 0) return;

  const percent = Math.floor(
    ((payAsYouGoYear - yearlyPrice) / payAsYouGoYear) * 100,
  );

  return percent > 0 ? percent : undefined;
};
