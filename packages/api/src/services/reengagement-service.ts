import type { CadenceFacts } from "./reengagement-cadence";
import type { Candidate, ReengagementKind } from "./reengagement-candidates";
import type { ReengagementRunSummary } from "./reengagement-report";
import type { ReengagementSuppressionReason } from "@pegada/shared/analytics/events";

import { Expo } from "expo-server-sdk";

import prisma from "@pegada/database";
import { ANALYTICS_EVENTS } from "@pegada/shared/analytics/events";
import { Prisma } from "@prisma/client";

import { sendError } from "../errors/errors";
import { captureEvent } from "../shared/analytics";
import { PushNotificationService } from "./push-notification-service";
import { cadenceDecision, readCadence } from "./reengagement-cadence";
import { collectCandidates } from "./reengagement-candidates";
import {
  emptyRunSummary,
  reportRun,
  suppressionRecorder,
} from "./reengagement-report";

/**
 * Re-exported rather than moved out of reach. The selectors live in their own
 * module now, and every caller and test that already imported them from here
 * still can, so the split costs nothing at the call sites.
 */
export type { Candidate, ReengagementKind } from "./reengagement-candidates";
export {
  INACTIVE_DAYS,
  MAX_CANDIDATES_PER_QUERY,
  MIN_NEW_DOGS,
  RECENT_ACTIVITY_HOURS,
  REENGAGEMENT_KINDS,
  selectLikesWaitingCandidates,
  selectNewDogsNearbyCandidates,
  selectUnansweredMatchCandidates,
  UNANSWERED_MATCH_HOURS,
} from "./reengagement-candidates";
export type { ReengagementRunSummary } from "./reengagement-report";

/**
 * The rule, in full: a re-engagement push may only leave inside 18:00 and
 * 19:00 of the recipient's own local hour, whatever the kind.
 *
 * Two hours rather than one because Vercel Cron is best effort and a single
 * missed invocation would otherwise drop a whole cohort for the day. The
 * dedupe key and the per-user cap are what stop the second hour resending.
 *
 * This used to be two rules: located users were allowed any hour from 09:00
 * to 21:00 and only the users without coordinates were held to the evening.
 * That is what put 200 pushes on the wire at 16:03 America/Sao_Paulo on
 * 2026-09-02: every one of them a located Brazilian user, comfortably inside a
 * twelve hour "not quiet hours" window that was never the intent. There is one
 * window now and every kind goes through it.
 */
const SEND_WINDOW_HOURS = new Set([18, 19]);

/**
 * America/Sao_Paulo, for users whose coordinates we do not have.
 *
 * A fixed offset is correct rather than convenient: Brazil dropped daylight
 * saving in 2019, so the zone has been UTC-3 all year round ever since.
 */
const FALLBACK_OFFSET_HOURS = -3;

const MAX_PUSHES_PER_RUN = 200;

const hourInOffset = (now: Date, offsetHours: number) =>
  (((now.getUTCHours() + offsetHours) % 24) + 24) % 24;

/**
 * The user's local hour, derived from longitude.
 *
 * Longitude over 15 is the solar offset, and it is deliberately the whole
 * timezone story here: a real tz lookup means shipping a coordinate-to-zone
 * dataset (tens of megabytes into a serverless bundle) to decide whether a
 * nudge goes out at 18:00 or 19:00.
 *
 * Political zones drift from solar time by up to an hour at the edges of a
 * zone, so the two hour window really means "somewhere between 17:00 and
 * 20:00 local" for a user near one. That is the price of not shipping the
 * dataset, and it is a price worth paying: every one of those hours is still
 * the evening. Brazil, where nearly all the users are, sits close enough to
 * its solar offset that most of them land on the nose.
 *
 * `null` when there is no longitude, which is the caller's cue to fall back to
 * America/Sao_Paulo.
 */
export const localHourFromLongitude = (
  longitude: number | null | undefined,
  now: Date,
): number | null => {
  if (longitude === null || longitude === undefined) return null;

  return hourInOffset(now, Math.round(longitude / 15));
};

/**
 * Is now the moment this user is allowed to be interrupted?
 *
 * One rule for everybody: the local hour has to be 18 or 19. The local hour
 * comes from the user's longitude when there is one, and from
 * America/Sao_Paulo when there is not. See {@link SEND_WINDOW_HOURS}.
 */
export const localHourFor = (
  longitude: number | null | undefined,
  now: Date,
): number =>
  localHourFromLongitude(longitude, now) ??
  hourInOffset(now, FALLBACK_OFFSET_HOURS);

export const isWithinSendWindow = (
  longitude: number | null | undefined,
  now: Date,
): boolean => SEND_WINDOW_HOURS.has(localHourFor(longitude, now));

const PRISMA_UNIQUE_VIOLATION = "P2002";

/**
 * One user's turn at the run, nudges in priority order. `kind` is the best one
 * they were due whether or not its key survived, so it still names the reason
 * when `queue` comes out empty.
 */
type PendingUser = {
  kind: ReengagementKind;
  longitude: number | null;
  queue: Candidate[];
};

export class ReengagementService {
  /**
   * Select everyone who is due a nudge right now and enqueue one push each.
   *
   * Called once an hour by the Vercel Cron so the per-user local time window
   * can be honoured; this method is what decides who is actually due.
   */
  static async run(now = new Date()): Promise<ReengagementRunSummary> {
    const summary = emptyRunSummary();

    // `finally` rather than a catch: the selectors, the claimed key lookup and
    // the cadence read all run before any per user handling can catch
    // anything, so a blip in one of them used to end the run with no heartbeat
    // at all, and a missing hour is documented as a dead cron. The row goes
    // out either way and the error still leaves through the route.
    try {
      await ReengagementService.#decide(summary, now);
    } catch (error) {
      // Without this the row a failed run emits is all zeroes, which is the
      // same row a quiet evening emits. The flag is what separates "nothing to
      // do" from "did not get to find out".
      summary.failed = true;
      throw error;
    } finally {
      await reportRun(summary, now);
    }

    return summary;
  }

  /** Everything the run does, minus the reporting the caller wraps it in. */
  static async #decide(
    summary: ReengagementRunSummary,
    now: Date,
  ): Promise<void> {
    const candidates = await collectCandidates(now);

    summary.candidates = candidates.length;

    if (candidates.length === 0) return;

    // A claimed key is not a candidate. Dropping those here rather than only
    // discovering them inside #send is what lets a user whose best nudge was
    // already sent fall through to the next one they qualify for, instead of
    // spending their whole day on a key that can never fire again.
    const claimed = await prisma.notificationLog.findMany({
      where: {
        dedupeKey: { in: candidates.map(({ dedupeKey }) => dedupeKey) },
      },
      select: { dedupeKey: true },
    });

    const claimedKeys = new Set(claimed.map(({ dedupeKey }) => dedupeKey));

    // Priority order survives the grouping, so a user's queue runs best nudge
    // first, and everybody with a candidate gets an entry. Filtering the
    // claimed ones out before the grouping is what used to lose people: they
    // left the run counted in nothing but a row level tally, which on an
    // hourly cron is most of the people it looks at.
    const perUser = new Map<string, PendingUser>();
    for (const candidate of candidates) {
      const spent = claimedKeys.has(candidate.dedupeKey);

      if (spent) summary.skippedAlreadySent += 1;

      const existing = perUser.get(candidate.userId);

      if (existing) {
        if (!spent) existing.queue.push(candidate);
      } else {
        perUser.set(candidate.userId, {
          kind: candidate.kind,
          longitude: candidate.longitude,
          queue: spent ? [] : [candidate],
        });
      }
    }

    const cadence = await readCadence([...perUser.keys()], now);

    const suppress = suppressionRecorder(summary);

    /** One person's turn. Every way out of it has counted them first. */
    const settle = async (
      userId: string,
      { kind, longitude, queue }: PendingUser,
    ): Promise<void> => {
      summary.people += 1;

      const facts = cadence.get(userId);
      const localHour = localHourFor(longitude, now);

      // Two ways to reach no decision at all: the run is full and everyone
      // behind it waits for the next one, or the user was deleted between the
      // selector and here. Neither is a judgement about the person, so neither
      // gets a reason, and both are counted rather than walked away from.
      if (summary.sent >= MAX_PUSHES_PER_RUN || !facts) {
        summary.held += 1;
        return;
      }

      try {
        const reason = await ReengagementService.#decideOne(
          facts,
          queue,
          localHour,
          summary,
          now,
        );

        // The kind of the nudge actually queued, falling back to the best one
        // they were due when the queue is empty. Reporting the claimed kind
        // for a user who still had a second nudge waiting would quietly change
        // what an existing event property means.
        if (reason) suppress(userId, queue[0]?.kind ?? kind, reason, localHour);
      } catch (error) {
        // One failed send used to take the run with it, and the run took the
        // heartbeat with it: the hour reported nothing at all, so an outage
        // read exactly like a cron that had stopped being scheduled. Every
        // person after this one in the map was lost too.
        sendError(error);
        summary.held += 1;
      }
    };

    for (const [userId, entry] of perUser) {
      // oxlint-disable-next-line no-await-in-loop -- Each send claims its dedupe key first; running them in parallel would race the cadence they enforce on each other.
      await settle(userId, entry);
    }
  }

  /**
   * What to record against one user, or null when the nudge went out.
   *
   * Split out of the loop so every path returns a reason rather than falling
   * off the end. The three that used to fall off it are the whole bug: a
   * claimed queue, a token Expo will not take, and a send that threw.
   */
  static async #decideOne(
    facts: CadenceFacts,
    queue: Candidate[],
    localHour: number,
    summary: ReengagementRunSummary,
    now: Date,
  ): Promise<ReengagementSuppressionReason | null> {
    // The cadence is decided before the clock, and both before the queue.
    // Somebody held back for a month is not also counted as "wrong hour"
    // twenty-two times a day, and somebody the schedule is holding is reported
    // against the schedule rather than against whichever of their keys a
    // previous run happened to claim. Ordering it the other way round would
    // put `already_sent` on most of the base and bury every cadence reason
    // underneath it, which is the opposite of what the reasons are for.
    const decision = cadenceDecision(facts, now);

    if (!decision.allowed) return decision.reason;
    if (!SEND_WINDOW_HOURS.has(localHour)) return "window";

    // Due, inside their own hour, and every nudge they had already claimed.
    if (queue.length === 0) return "already_sent";

    const outcome = await ReengagementService.#sendFirstAvailable(
      queue,
      summary,
      now,
    );

    return outcome === "sent" ? null : outcome;
  }

  /**
   * Walk one user's queue until a nudge actually goes out.
   *
   * The queue is already free of keys claimed before the run started; this
   * loop is what covers a key claimed *during* it, by another instance racing
   * the same candidate.
   *
   * The two failures are named rather than collapsed into a false: the caller
   * has to record one of them, and "it did not go" is not a reason.
   */
  static async #sendFirstAvailable(
    queue: Candidate[],
    summary: ReengagementRunSummary,
    now: Date,
  ): Promise<"already_sent" | "dead_token" | "sent"> {
    for (const candidate of queue) {
      // A token Expo will reject is a guaranteed dropped push, and it is the
      // same token for every candidate this user has, so there is nothing left
      // to try. Counting it as sent would put it in the denominator of the
      // open rate, which is the number this whole change exists to produce.
      if (!Expo.isExpoPushToken(candidate.pushToken)) {
        summary.skippedUnreachable += 1;
        return "dead_token";
      }

      // oxlint-disable-next-line no-await-in-loop -- Sequential by design: the next candidate is only tried when this one turns out to be claimed.
      const outcome = await ReengagementService.#send(candidate, now);

      if (outcome === "sent") {
        summary.sent += 1;
        summary.byKind[candidate.kind] += 1;
        return "sent";
      }

      summary.skippedAlreadySent += 1;
    }

    return "already_sent";
  }

  /**
   * Claim the dedupe key, then send.
   *
   * The write comes first on purpose: a crash between the two costs one push,
   * while the other order costs a duplicate, and a duplicate re-engagement
   * push is the thing users uninstall over.
   */
  static async #send(
    candidate: Candidate,
    now: Date,
  ): Promise<"sent" | "already-sent"> {
    let notificationLogId: string;

    try {
      const log = await prisma.notificationLog.create({
        data: {
          userId: candidate.userId,
          kind: candidate.kind,
          dedupeKey: candidate.dedupeKey,
          // The run's clock, not the column default. Every cooldown in here
          // measures `sentAt` against the `now` the run was handed, so letting
          // the database stamp its own wall clock puts the row on a different
          // timeline than the rule that reads it back.
          sentAt: now,
        },
        select: { id: true },
      });

      notificationLogId = log.id;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === PRISMA_UNIQUE_VIOLATION
      ) {
        return "already-sent";
      }

      throw error;
    }

    await PushNotificationService.enqueuePushNotification({
      to: candidate.pushToken,
      title: candidate.title,
      body: candidate.body,
      data: { url: candidate.url, kind: candidate.kind },
      // Carried through the queue so the ticket and receipt this produces can
      // be attributed back to this user, this kind, and this log row.
      userId: candidate.userId,
      pushKind: candidate.kind,
      notificationLogId,
    });

    if (candidate.clearsNewDogsAlert) {
      // The request was a one-shot ("avisar quando chegar dog novo"), so it is
      // cleared once answered. Leaving it set would exempt the user from the
      // inactivity rule forever and make the fake door's funnel unreadable.
      try {
        await prisma.user.update({
          where: { id: candidate.userId },
          data: { newDogsAlertRequestedAt: null },
        });
      } catch (error) {
        sendError(error);
      }
    }

    captureEvent(candidate.userId, ANALYTICS_EVENTS.REENGAGEMENT_PUSH_SENT, {
      dedupe_key: candidate.dedupeKey,
      kind: candidate.kind,
    });

    return "sent";
  }
}
