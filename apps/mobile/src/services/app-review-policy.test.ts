/**
 * The review prompt is a one-shot resource: iOS shows the native rating sheet
 * a handful of times per year per user and silently swallows the rest, so
 * spending it badly is not recoverable. These tests pin the two things that
 * make it easy to spend badly.
 *
 * First, the monthly throttle has to stay one rule. Three call sites now ask
 * for the same prompt, and a throttle that each of them re-implemented would
 * drift into three throttles and burn the quota in a week.
 *
 * Second, the skip reasons have to separate "something ate the prompt" from
 * "this user has not got there yet". Only the first kind reaches PostHog:
 * `NotFirstMatch` fires on every celebration screen every user ever sees, and
 * as an event it would drown the signal the readout depends on.
 */
import {
  ReviewSkipReason,
  ReviewTrigger,
  SECOND_MESSAGE_TRIGGER_COUNT,
  shouldRequestReview,
} from "./app-review-policy";

const NOW = new Date("2026-06-15T12:00:00.000Z");

/** An eligible first-match ask, which each test then breaks one way. */
const input = (overrides: Partial<Parameters<typeof shouldRequestReview>[0]>) =>
  ({
    trigger: ReviewTrigger.FirstMatch,
    matchCount: 1,
    sentMessageCount: 0,
    reviewStatus: null,
    lastPromptAt: null,
    now: NOW,
    firstPromptSkipped: true,
    isStoreReviewAvailable: true,
    ...overrides,
  }) satisfies Parameters<typeof shouldRequestReview>[0];

describe("the first match trigger", () => {
  it("asks on the very first match", () => {
    expect(shouldRequestReview(input({}))).toStrictEqual({ allowed: true });
  });

  it("stays quiet on every match after it", () => {
    expect(shouldRequestReview(input({ matchCount: 2 }))).toStrictEqual({
      allowed: false,
      reason: ReviewSkipReason.NotFirstMatch,
      blocked: false,
    });
  });

  it("does not report the ordinary case, which is most match screens", () => {
    const decision = shouldRequestReview(input({ matchCount: 7 }));

    // An event here would fire once per celebration screen per user, and the
    // readout divides ratings by prompts actually shown.
    expect(decision).toMatchObject({ blocked: false });
  });
});

describe("the second message trigger", () => {
  const secondMessage = {
    trigger: ReviewTrigger.SecondMessage,
    matchCount: 3,
    sentMessageCount: SECOND_MESSAGE_TRIGGER_COUNT,
  };

  it("catches the users the match prompt never reached", () => {
    expect(shouldRequestReview(input(secondMessage))).toStrictEqual({
      allowed: true,
    });
  });

  it("waits for the second message, not the first", () => {
    expect(
      shouldRequestReview(input({ ...secondMessage, sentMessageCount: 1 })),
    ).toStrictEqual({
      allowed: false,
      reason: ReviewSkipReason.NotEnoughMessages,
      blocked: false,
    });
  });

  it("steps aside when the match prompt already landed", () => {
    // Two asks for one user is how an app gets rated one star for nagging.
    expect(
      shouldRequestReview(
        input({ ...secondMessage, firstPromptSkipped: false }),
      ),
    ).toStrictEqual({
      allowed: false,
      reason: ReviewSkipReason.FirstPromptAlreadyShown,
      blocked: false,
    });
  });
});

describe("the messages tab trigger", () => {
  it("asks once the user has a match", () => {
    expect(
      shouldRequestReview(
        input({ trigger: ReviewTrigger.MessagesTab, matchCount: 1 }),
      ),
    ).toStrictEqual({ allowed: true });
  });

  it("says nothing to a user with an empty list", () => {
    expect(
      shouldRequestReview(
        input({ trigger: ReviewTrigger.MessagesTab, matchCount: 0 }),
      ),
    ).toStrictEqual({
      allowed: false,
      reason: ReviewSkipReason.NoMatches,
      blocked: false,
    });
  });
});

describe("the monthly throttle, which every trigger answers to", () => {
  it("blocks an ask made three weeks after the last one", () => {
    expect(
      shouldRequestReview(input({ lastPromptAt: "2026-05-25T12:00:00.000Z" })),
    ).toStrictEqual({
      allowed: false,
      reason: ReviewSkipReason.Throttled,
      blocked: true,
    });
  });

  it("lets the next one through a month later", () => {
    expect(
      shouldRequestReview(input({ lastPromptAt: "2026-05-14T12:00:00.000Z" })),
    ).toStrictEqual({ allowed: true });
  });

  it("applies to the message trigger too, not only the match one", () => {
    expect(
      shouldRequestReview(
        input({
          trigger: ReviewTrigger.SecondMessage,
          sentMessageCount: SECOND_MESSAGE_TRIGGER_COUNT,
          lastPromptAt: "2026-06-10T12:00:00.000Z",
        }),
      ),
    ).toMatchObject({ reason: ReviewSkipReason.Throttled });
  });

  it("ignores a stored date it cannot read", () => {
    // Treating an unparseable value as "recent" would lock the user out of
    // the prompt permanently. The allowed path overwrites it with a good one.
    expect(
      shouldRequestReview(input({ lastPromptAt: "not-a-date" })),
    ).toStrictEqual({
      allowed: true,
    });
  });
});

describe("blockers outside the trigger", () => {
  it("never asks a user who already went to the store", () => {
    expect(
      shouldRequestReview(input({ reviewStatus: "completed" })),
    ).toStrictEqual({
      allowed: false,
      reason: ReviewSkipReason.AlreadyReviewed,
      blocked: true,
    });
  });

  it("reports the platforms that have no rating sheet to offer", () => {
    // TestFlight and the web resolve `isAvailableAsync` false. Reporting it
    // is the point: a trigger that only ever fires on TestFlight builds looks
    // identical to one nobody reaches.
    expect(
      shouldRequestReview(input({ isStoreReviewAvailable: false })),
    ).toStrictEqual({
      allowed: false,
      reason: ReviewSkipReason.StoreReviewUnavailable,
      blocked: true,
    });
  });

  it("prefers the trigger's own verdict over a global one", () => {
    // A user on their fifth match who is also throttled has not reached this
    // trigger at all, so counting them as "the throttle ate it" would inflate
    // the number the readout uses to judge the throttle.
    expect(
      shouldRequestReview(
        input({ matchCount: 5, lastPromptAt: "2026-06-14T12:00:00.000Z" }),
      ),
    ).toStrictEqual({
      allowed: false,
      reason: ReviewSkipReason.NotFirstMatch,
      blocked: false,
    });
  });
});
