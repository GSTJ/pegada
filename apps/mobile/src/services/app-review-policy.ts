import { addMonths } from "date-fns/addMonths";
import { isBefore } from "date-fns/isBefore";

/**
 * The review prompt had one passive trigger: opening the Messages tab with at
 * least one match. That is a screen people open to do something else, and it
 * lands long after the moment they are happiest with the app. The two new
 * triggers ride that moment instead, and this module holds the decision they
 * share so the monthly throttle stays a single rule rather than three.
 *
 * Everything with a side effect (storage, the store availability check, the
 * modal) lives in `app-review.tsx`. This file is data in, verdict out, so the
 * rules can be read and tested without a renderer.
 */

export enum ReviewTrigger {
  /** The celebration screen, the first time this user ever matches. */
  FirstMatch = "first_match",
  /** The second message they send, when the match prompt never reached them. */
  SecondMessage = "second_message",
  /** The original trigger: the Messages tab with at least one match. */
  MessagesTab = "messages_tab",
}

export enum ReviewSkipReason {
  /** They already went to the store. Never ask again. */
  AlreadyReviewed = "already_reviewed",
  /** Asked within the last month, whatever the trigger was. */
  Throttled = "throttled",
  /** TestFlight, web, or Android below 5.0. */
  StoreReviewUnavailable = "store_review_unavailable",
  /** Not their first match, so this is not the peak we are aiming at. */
  NotFirstMatch = "not_first_match",
  /** Trigger 2 exists only for the users trigger 1 could not reach. */
  FirstPromptAlreadyShown = "first_prompt_already_shown",
  /** Still on their first message. */
  NotEnoughMessages = "not_enough_messages",
  /** The Messages tab with an empty list is nobody's happy moment. */
  NoMatches = "no_matches",
}

/** The message trigger 2 waits for. */
export const SECOND_MESSAGE_TRIGGER_COUNT = 2;

/** One prompt a month, across every trigger. */
const REVIEW_THROTTLE_MONTHS = 1;

export type ReviewPolicyInput = {
  trigger: ReviewTrigger;
  /** Matches this user has, counting the one being celebrated. */
  matchCount: number;
  /** Messages this user has sent, counted on the device. */
  sentMessageCount: number;
  /** `"completed"` once they have been handed to the store. */
  reviewStatus: "completed" | null;
  /** ISO date of the last prompt, whichever trigger produced it. */
  lastPromptAt: string | null;
  now: Date;
  /** True when the first-match prompt never reached this user. */
  firstPromptSkipped: boolean;
  /** `StoreReview.isAvailableAsync()`. */
  isStoreReviewAvailable: boolean;
};

export type ReviewDecision =
  | { allowed: true }
  | {
      allowed: false;
      reason: ReviewSkipReason;
      /**
       * True when the user reached the trigger and something outside it ate
       * the prompt, which is the case worth an analytics event. The plain
       * "not yet" verdicts are false: `NotFirstMatch` alone would fire on
       * every celebration screen every user ever sees.
       */
      blocked: boolean;
    };

const deny = (reason: ReviewSkipReason, blocked: boolean): ReviewDecision => ({
  allowed: false,
  reason,
  blocked,
});

/**
 * A stored date we cannot parse is treated as no date at all. Reading it as
 * "throttled" would lock the user out of the prompt forever, and the allowed
 * path overwrites it with a fresh one.
 */
const isThrottled = (lastPromptAt: string, now: Date) => {
  const lastPrompt = new Date(lastPromptAt);
  if (Number.isNaN(lastPrompt.getTime())) return false;

  return isBefore(now, addMonths(lastPrompt, REVIEW_THROTTLE_MONTHS));
};

/** Whether this trigger has earned the right to ask, ignoring the throttle. */
const isTriggerReached = ({
  trigger,
  matchCount,
  sentMessageCount,
  firstPromptSkipped,
}: ReviewPolicyInput): ReviewDecision => {
  switch (trigger) {
    case ReviewTrigger.FirstMatch:
      if (matchCount !== 1) return deny(ReviewSkipReason.NotFirstMatch, false);
      return { allowed: true };

    case ReviewTrigger.SecondMessage:
      if (!firstPromptSkipped) {
        return deny(ReviewSkipReason.FirstPromptAlreadyShown, false);
      }
      if (sentMessageCount < SECOND_MESSAGE_TRIGGER_COUNT) {
        return deny(ReviewSkipReason.NotEnoughMessages, false);
      }
      return { allowed: true };

    case ReviewTrigger.MessagesTab:
      if (matchCount < 1) return deny(ReviewSkipReason.NoMatches, false);
      return { allowed: true };
  }
};

export const shouldRequestReview = (
  input: ReviewPolicyInput,
): ReviewDecision => {
  const triggerReached = isTriggerReached(input);
  if (!triggerReached.allowed) return triggerReached;

  if (input.reviewStatus === "completed") {
    return deny(ReviewSkipReason.AlreadyReviewed, true);
  }

  if (!input.isStoreReviewAvailable) {
    return deny(ReviewSkipReason.StoreReviewUnavailable, true);
  }

  if (input.lastPromptAt && isThrottled(input.lastPromptAt, input.now)) {
    return deny(ReviewSkipReason.Throttled, true);
  }

  return { allowed: true };
};
