import { FREE_DAILY_SWIPE_LIMIT } from "@pegada/shared/constants/constants";

/**
 * The free like allowance the API last reported.
 *
 * The server decides this from an environment variable, so the number is
 * allowed to change without a new build and a shipped constant is only ever a
 * guess. It starts at the value this build was compiled with, which is the
 * right answer until the launch query says otherwise and stays the answer on
 * an older API that does not send the field.
 */
let freeDailyLikeLimit = FREE_DAILY_SWIPE_LIMIT;

export const getFreeDailyLikeLimit = () => freeDailyLikeLimit;

export const rememberFreeDailyLikeLimit = (limit?: number) => {
  if (limit && limit > 0) freeDailyLikeLimit = limit;
};
