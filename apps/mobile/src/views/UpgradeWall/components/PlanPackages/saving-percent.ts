const MONTHS_IN_A_YEAR = 12;

/**
 * Percent saved by paying a year up front instead of twelve monthly charges.
 * Rounded down so the badge never promises more than the plans deliver.
 * Returns undefined when either price is missing or the yearly plan is not
 * actually cheaper, in which case no badge should be shown.
 */
export const getYearlySavingPercent = (
  monthlyPrice: number | undefined,
  yearlyPrice: number | undefined,
) => {
  if (monthlyPrice === undefined || yearlyPrice === undefined) return;

  const twelveMonths = monthlyPrice * MONTHS_IN_A_YEAR;
  if (twelveMonths <= 0) return;

  const percent = Math.floor(
    ((twelveMonths - yearlyPrice) / twelveMonths) * 100,
  );

  return percent > 0 ? percent : undefined;
};
