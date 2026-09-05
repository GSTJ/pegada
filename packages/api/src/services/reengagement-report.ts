import type {
  ReengagementPushKind,
  ReengagementSuppressionReason,
} from "@pegada/shared/analytics/events";

import prisma from "@pegada/database";
import { ANALYTICS_EVENTS } from "@pegada/shared/analytics/events";

import { sendError } from "../errors/errors";
import { captureEvent } from "../shared/analytics";
import { MIN_GAP_DAYS } from "./reengagement-cadence";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * The distinct id the run level event is attributed to.
 *
 * A run belongs to the cron rather than to any one person, and picking a user
 * out of the batch to hang it on would put a machine event in that person's
 * timeline and skew any per-person count built on it. One constant id keeps it
 * a system row.
 */
const REENGAGEMENT_CRON_ACTOR = "reengagement-cron";

/** What one hourly run did, in the shape the readout reads it in. */
export type ReengagementRunSummary = {
  sent: number;
  byKind: Record<ReengagementPushKind, number>;
  candidates: number;
  /**
   * Users who had a nudge waiting and did not get it, by reason. Counted once
   * per user per run, which is not the same as the events: those are reported
   * once a day so they count people rather than passes.
   */
  suppressed: Record<ReengagementSuppressionReason, number>;
  skippedAlreadySent: number;
  skippedUnreachable: number;
};

/**
 * How many people are inside the weekly floor right now.
 *
 * Not derivable from the summary. The likes-waiting and new-dogs selectors
 * mirror the floor into their own SQL so the users it holds never take a slot
 * in the candidate limit, which is the right call for the query and the reason
 * those people never reach the suppression path. This reads them straight off
 * `NotificationLog` instead, so a run that sent nothing can say why.
 *
 * Taken at the end of a run rather than the start, so somebody sent a push by
 * that run is already counted. That is the number the question wants: how many
 * people the floor is holding as of now.
 */
const usersInWeeklyFloor = async (now: Date): Promise<number> => {
  const floor = new Date(now.getTime() - MIN_GAP_DAYS * DAY_MS);

  const [row] = await prisma.$queryRaw<{ count: number }[]>`
    SELECT COUNT(DISTINCT "userId")::int AS "count"
    FROM "NotificationLog"
    WHERE "sentAt" > ${floor}
  `;

  return row?.count ?? 0;
};

/**
 * One row per run, sent whatever the run decided.
 *
 * See the catalogue entry on `Reengagement Cron Ran`. The per-user events are
 * reported once a day, so between two of those report hours the only honest
 * reading of an empty chart is "no information", and that is indistinguishable
 * from a cron that has stopped running. This row arrives hourly and carries the
 * counts, so the difference is visible without opening the database.
 */
export const reportRun = async (
  summary: ReengagementRunSummary,
  now: Date,
): Promise<void> => {
  try {
    const inFloor = await usersInWeeklyFloor(now);

    captureEvent(
      REENGAGEMENT_CRON_ACTOR,
      ANALYTICS_EVENTS.REENGAGEMENT_CRON_RAN,
      {
        candidates: summary.candidates,
        sent: summary.sent,
        skipped_already_sent: summary.skippedAlreadySent,
        skipped_unreachable: summary.skippedUnreachable,
        suppressed_cooldown: summary.suppressed.cooldown,
        suppressed_dead_token: summary.suppressed.dead_token,
        suppressed_gave_up: summary.suppressed.gave_up,
        suppressed_monthly_cap: summary.suppressed.monthly_cap,
        suppressed_window: summary.suppressed.window,
        users_in_weekly_floor: inFloor,
      },
    );
  } catch (error) {
    // The readout is not worth failing a run over. It is still worth knowing
    // about, which is what separates this from the silent swallow inside
    // `captureEvent`: that one guards a working send, this one guards a count
    // query that should never throw.
    sendError(error);
  }
};
