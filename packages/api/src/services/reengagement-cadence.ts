import type { ReengagementSuppressionReason } from "@pegada/shared/analytics/events";

import prisma from "@pegada/database";
import { Prisma } from "@prisma/client";

import { DEAD_TOKEN_ERROR } from "../shared/push-errors";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * The whole cadence, in one block.
 *
 * The numbers come from what the rules they replace actually did: 800 pushes
 * to 529 users in seven days, so a person could collect four or five nudges in
 * a week off three kinds that each believed they were being restrained. Pegada
 * is used weekly rather than daily, so the floor is a week and the ceiling is a
 * month, and how often someone hears from us is driven by whether the last
 * push worked rather than by how long they have been gone.
 *
 * A push worked when the person came back after it. `Push Notification Opened`
 * is the honest signal and is what this should read once the build that reports
 * it is in the store; until then `User.lastActiveAt` moving to after the send
 * is the proxy. It is a conservative proxy: it credits the push with a return
 * it may have had nothing to do with, and every one of those errs towards
 * nudging less.
 */

/** How long someone has to have been gone before the first nudge. */
const FIRST_PUSH_AFTER_INACTIVE_DAYS = 5;

/**
 * The wait after a push nobody answered, by how many have gone unanswered.
 *
 * The third rung is here for the shape rather than because it is reached: the
 * long pause below trips first. It stays so that raising
 * {@link UNANSWERED_PUSHES_BEFORE_PAUSE} has a value to use rather than
 * silently falling back to six months.
 */
const UNANSWERED_GAP_DAYS = [10, 20, 40] as const;

/** Unanswered pushes that end the schedule and start the long pause. */
const UNANSWERED_PUSHES_BEFORE_PAUSE = 3;

/**
 * The pause once the schedule runs out, and again after every unanswered push
 * that follows it.
 *
 * Six months. Somebody who has ignored three nudges hears from the app twice a
 * year at most, which is the line between a product that is still there and one
 * that is pestering. "Seis meses, um ano" was the ask and this is the floor of
 * that range.
 */
const LONG_PAUSE_DAYS = 180;

/** Hard floor between two pushes, whatever the schedule works out to. */
export const MIN_GAP_DAYS = 7;

/** Rolling ceiling, whatever the schedule works out to. */
const MONTHLY_WINDOW_DAYS = 30;
const MAX_PUSHES_PER_MONTH = 2;

/**
 * Slack on the scheduled gaps so a gap counted in whole days still lands inside
 * the two hour evening slot.
 *
 * A push stamped at 19:03 is three minutes short of ten days old at 19:00 ten
 * days later, so without this the nudge slips a day at every rung and the
 * schedule walks away from itself. The two hard caps are deliberately left
 * exact: they are ceilings rather than appointments, so nothing is owed to
 * them.
 */
const SLOT_SLACK_HOURS = 2;

/**
 * When a suppression is worth an event.
 *
 * The cron runs hourly and a held back user is held back at every one of those
 * runs, so emitting on each would count passes over a person rather than
 * people. A cadence decision is reported at the close of the send window, when
 * the day's answer is final; a missed window at the hour after it, which is the
 * first moment "the slot came and went" is a fact rather than a guess.
 */
export const POLICY_REPORT_HOUR = 19;
export const WINDOW_REPORT_HOUR = 20;

/**
 * Everything the cadence needs to know about one user, none of it stored.
 *
 * `NotificationLog` plus `User.lastActiveAt` already say all of it, so there is
 * no counter to keep in sync and no column that can drift away from the rows it
 * summarises. A backfill is not needed either: the history is the history.
 */
export type CadenceFacts = {
  userId: string;
  lastActiveAt: Date | null;
  /**
   * Pushes sent since the user was last seen, which is the same thing as
   * pushes in a row that did not bring them back. Zero the moment they return,
   * whether they returned because of a push or on their own.
   */
  unanswered: number;
  /** Pushes inside the rolling monthly window. */
  monthly: number;
  lastPushAt: Date | null;
  lastTicketError: string | null;
  lastReceiptError: string | null;
};

/**
 * The three facts per user in one round trip.
 *
 * Lateral subqueries rather than three reads: the row count is bounded by the
 * candidate limit, and each of them is a lookup on an index `NotificationLog`
 * already carries. `unanswered` deliberately has no time floor. Somebody who
 * was given up on eight months ago and never came back has to still read as
 * given up on, and a window would quietly forget them and start the schedule
 * over.
 *
 * Every row in `NotificationLog` is a scheduled nudge today, which is why no
 * kind is filtered out: the cadence is one budget for the whole cron. The day a
 * transactional push starts logging here, this is the query that has to learn
 * the difference, or a single "you have a new message" will mute the win-back
 * schedule for a week.
 */
export const readCadence = async (
  userIds: string[],
  now: Date,
): Promise<Map<string, CadenceFacts>> => {
  const monthlyFloor = new Date(now.getTime() - MONTHLY_WINDOW_DAYS * DAY_MS);

  const rows = await prisma.$queryRaw<CadenceFacts[]>`
    SELECT
      "User"."id" AS "userId",
      "User"."lastActiveAt" AS "lastActiveAt",
      "unanswered"."count"::int AS "unanswered",
      "monthly"."count"::int AS "monthly",
      "last"."sentAt" AS "lastPushAt",
      "last"."ticketError" AS "lastTicketError",
      "last"."receiptError" AS "lastReceiptError"
    FROM "User"
    CROSS JOIN LATERAL (
      SELECT COUNT(*) AS "count"
      FROM "NotificationLog"
      WHERE "NotificationLog"."userId" = "User"."id"
      /* A null lastActiveAt is unknown rather than active, so every push
         counts. It is the same reading the selectors take. */
      AND (
        "User"."lastActiveAt" IS NULL
        OR "NotificationLog"."sentAt" > "User"."lastActiveAt"
      )
    ) AS "unanswered"
    CROSS JOIN LATERAL (
      SELECT COUNT(*) AS "count"
      FROM "NotificationLog"
      WHERE "NotificationLog"."userId" = "User"."id"
      AND "NotificationLog"."sentAt" > ${monthlyFloor}
    ) AS "monthly"
    LEFT JOIN LATERAL (
      SELECT "sentAt", "ticketError", "receiptError"
      FROM "NotificationLog"
      WHERE "NotificationLog"."userId" = "User"."id"
      ORDER BY "sentAt" DESC
      LIMIT 1
    ) AS "last" ON true
    WHERE "User"."id" IN (${Prisma.join(userIds)})
  `;

  return new Map(rows.map((row) => [row.userId, row]));
};

/** Every reason except the send window, which is not a cadence decision. */
type PolicyReason = Exclude<ReengagementSuppressionReason, "window">;

const daysBetween = (from: Date, to: Date) =>
  (to.getTime() - from.getTime()) / DAY_MS;

/**
 * The gap owed after an unanswered push, in days.
 *
 * Reads as the schedule it implements: 10 days after the first unanswered
 * push, 20 after the second, and then the app stops asking for half a year at
 * a time. Anything past the pause threshold stays on the pause, so a nudge
 * sent at the end of one six month wait that also goes unanswered buys another.
 */
const gapAfterUnanswered = (unanswered: number) =>
  unanswered >= UNANSWERED_PUSHES_BEFORE_PAUSE
    ? LONG_PAUSE_DAYS
    : (UNANSWERED_GAP_DAYS[unanswered - 1] ?? LONG_PAUSE_DAYS);

/**
 * May this user be interrupted today?
 *
 * The order is the order the reasons are worth knowing in. A dead token is a
 * fact about the device and outranks anything about timing; the two hard caps
 * come next because they hold whatever the schedule says; the schedule itself
 * is last, and it is the only part that depends on whether the last push
 * worked.
 */
export const cadenceDecision = (
  facts: CadenceFacts,
  now: Date,
): { allowed: true } | { allowed: false; reason: PolicyReason } => {
  const { lastActiveAt, lastPushAt, monthly, unanswered } = facts;

  const awayLongEnough =
    lastActiveAt === null ||
    daysBetween(lastActiveAt, now) >= FIRST_PUSH_AFTER_INACTIVE_DAYS;

  if (lastPushAt === null) {
    // Nobody has ever nudged this person, so the only question is how long
    // they have been gone.
    return awayLongEnough
      ? { allowed: true }
      : { allowed: false, reason: "cooldown" };
  }

  // A token Expo rejected is a push that cannot land, and re-sending to it
  // burns the cap on nothing. The `unanswered` guard is what stops this being
  // a life sentence: registering a new token means opening the app, which
  // moves `lastActiveAt` past the failed send and clears the streak, so a
  // reinstall is back in the schedule rather than muted forever.
  const deadToken =
    facts.lastTicketError === DEAD_TOKEN_ERROR ||
    facts.lastReceiptError === DEAD_TOKEN_ERROR;

  if (unanswered > 0 && deadToken) {
    return { allowed: false, reason: "dead_token" };
  }

  if (monthly >= MAX_PUSHES_PER_MONTH) {
    return { allowed: false, reason: "monthly_cap" };
  }

  const sinceLastPush = daysBetween(lastPushAt, now);

  if (sinceLastPush < MIN_GAP_DAYS) {
    return { allowed: false, reason: "cooldown" };
  }

  if (unanswered === 0) {
    // They came back after the last push, so the schedule starts over and the
    // only question is the same one it was the first time.
    return awayLongEnough
      ? { allowed: true }
      : { allowed: false, reason: "cooldown" };
  }

  const owed = gapAfterUnanswered(unanswered) - SLOT_SLACK_HOURS / 24;

  if (sinceLastPush >= owed) return { allowed: true };

  return {
    allowed: false,
    reason:
      unanswered >= UNANSWERED_PUSHES_BEFORE_PAUSE ? "gave_up" : "cooldown",
  };
};
