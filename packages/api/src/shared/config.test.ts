import { FREE_DAILY_SWIPE_LIMIT } from "@pegada/shared/constants/constants";

import { freeDailyLikeLimitSchema } from "./config";

/**
 * This value gates whether a swipe is accepted, and it is typed into a hosting
 * dashboard by hand. Every shape a person can leave in that box has to resolve
 * to a usable number, because the alternative is an API that will not boot.
 */
describe("FREE_DAILY_LIKE_LIMIT parsing", () => {
  it("takes the number an operator set", () => {
    expect(freeDailyLikeLimitSchema.parse("25")).toBe(25);
    expect(freeDailyLikeLimitSchema.parse("1")).toBe(1);
  });

  it("keeps the shipped default when the variable is not set", () => {
    expect(freeDailyLikeLimitSchema.parse(undefined)).toBe(
      FREE_DAILY_SWIPE_LIMIT,
    );
  });

  // Clearing the box is how someone turns the experiment off on a host that
  // keeps a variable once it has been added.
  it("treats a blank value as unset", () => {
    expect(freeDailyLikeLimitSchema.parse("")).toBe(FREE_DAILY_SWIPE_LIMIT);
  });

  it("falls back instead of throwing on a value it cannot use", () => {
    for (const value of ["abc", "0", "-5", "2.5", null, {}, "1e999"]) {
      expect(freeDailyLikeLimitSchema.parse(value)).toBe(
        FREE_DAILY_SWIPE_LIMIT,
      );
    }
  });
});
