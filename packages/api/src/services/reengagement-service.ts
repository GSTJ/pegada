import type { ReengagementPushKind } from "@pegada/shared/analytics/events";

import { Expo } from "expo-server-sdk";

import prisma from "@pegada/database";
import { ANALYTICS_EVENTS } from "@pegada/shared/analytics/events";
import { Language } from "@pegada/shared/i18n/types/types";
import { Prisma } from "@prisma/client";

import { sendError } from "../errors/errors";
import { captureEvent } from "../shared/analytics";
import { PushNotificationService } from "./push-notification-service";
import { TranslationService } from "./translation-service";

/**
 * `satisfies` rather than a bare `as const`: the catalogue restates these three
 * values (it cannot import them without a cycle), and this is what makes a new
 * kind added here a compile error until the catalogue knows about it too.
 */
export const REENGAGEMENT_KINDS = {
  UNANSWERED_MATCH: "unanswered_match",
  NEW_DOGS_NEARBY: "new_dogs_nearby",
  LIKES_WAITING: "likes_waiting",
} as const satisfies Record<string, ReengagementPushKind>;

export type ReengagementKind =
  (typeof REENGAGEMENT_KINDS)[keyof typeof REENGAGEMENT_KINDS];

/** Hours after a silent match at which the two sides get nudged. */
export const UNANSWERED_MATCH_HOURS = [24, 72] as const;

/**
 * How far back each unanswered-match bucket reaches. Without a floor, the
 * first run after deploy would nudge every silent match ever created; with it,
 * a match is only ever eligible inside the window that follows its own
 * threshold.
 */
const UNANSWERED_MATCH_MAX_AGE_HOURS = 14 * 24;

/** Days without a positive swipe that make a user eligible for new dogs. */
export const INACTIVE_DAYS = [3, 7] as const;

/**
 * How recently someone has to have used the app to be left alone.
 *
 * Every selector below infers "gone quiet" from a proxy (no positive swipe, a
 * match nobody spoke on, a like nobody answered), and each proxy misses the
 * person who is in the app right now doing something else. `lastActiveAt` is
 * the direct signal, written on authenticated requests, so it is the guard that
 * keeps a win-back push off the screen of someone who never left.
 */
export const RECENT_ACTIVITY_HOURS = 24;

/** New dogs that have to exist nearby before the nudge is worth sending. */
export const MIN_NEW_DOGS = 3;

/** How old a like has to be before it counts as waiting. */
const LIKES_WAITING_HOURS = 24;

/**
 * When a user has never swiped positively there is no anchor to count new dogs
 * from, so the count starts here instead.
 *
 * This doubles as how often that cohort may be nudged again. Every other user
 * is rate limited by their own anchor moving, which needs them to do something;
 * someone who has never swiped has nothing that moves, so without a period in
 * the key they would be a one-time audience forever. A calendar-aligned bucket
 * rather than a sliding window, because the dedupe key has to name the same
 * period the already-sent filter is testing.
 */
const NEW_DOGS_FALLBACK_WINDOW_DAYS = 30;

/**
 * Above this, `preferredMaxDistance` means "anywhere" and no distance filter
 * is applied. Same threshold the swipe deck uses in SuggestionService, so the
 * count in the copy matches the deck the user lands on.
 */
const UNLIMITED_DISTANCE_KM = 295;

/** Local hours between which nothing is sent. */
const QUIET_HOURS_START = 21;
const QUIET_HOURS_END = 9;

/**
 * America/Sao_Paulo, for users whose coordinates we do not have.
 *
 * Two hours rather than one because Vercel Cron is best effort: a single
 * missed invocation would drop this whole cohort for the day. The dedupe key
 * and the daily cap are what stop the second hour resending.
 */
const FALLBACK_OFFSET_HOURS = -3;
const FALLBACK_SEND_HOURS = new Set([18, 19]);

/** One re-engagement push per user per rolling day. */
/**
 * One re-engagement push per user per day.
 *
 * 23 hours rather than 24, and strictly greater than rather than inclusive,
 * because the job runs hourly and the cap is measured against the previous
 * send. At exactly 24 a user nudged at 19:00 is still inside the window at
 * 18:00 the next day, so their slot slides an hour later each time until it
 * falls out of the evening entirely and they end up on every other day. The
 * hour of slack absorbs that without ever allowing two sends in a calendar
 * day, since the earliest either can land is 09:00 local.
 */
const USER_COOLDOWN_HOURS = 23;

/** Bounds one invocation so a backlog cannot outrun the function budget. */
const MAX_CANDIDATES_PER_QUERY = 500;
const MAX_PUSHES_PER_RUN = 200;

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

export type Candidate = {
  kind: ReengagementKind;
  userId: string;
  pushToken: string;
  longitude: number | null;
  dedupeKey: string;
  title: string;
  body: string;
  url: string;
  /** Set on the "tell me when a new dog shows up" path, cleared once sent. */
  clearsNewDogsAlert?: boolean;
};

export type ReengagementRunSummary = {
  sent: number;
  byKind: Record<ReengagementKind, number>;
  candidates: number;
  skippedQuietHours: number;
  skippedCooldown: number;
  skippedAlreadySent: number;
  skippedUnreachable: number;
};

/**
 * The instant before which a user counts as away.
 *
 * A null `lastActiveAt` is unknown rather than active: the column is only
 * written once a user makes an authenticated request after #217 shipped, so
 * reading null as "here" would mute the whole cron until everyone came back on
 * their own. The proxy each selector already applies decides those users.
 */
const recentActivityFloor = (now: Date) =>
  new Date(now.getTime() - RECENT_ACTIVITY_HOURS * HOUR_MS);

const isRecentlyActive = (lastActiveAt: Date | null, now: Date) =>
  lastActiveAt !== null && lastActiveAt > recentActivityFloor(now);

/** The same rule in SQL, for the selectors that run as raw queries. */
const notRecentlyActive = (now: Date) => Prisma.sql`
  (
    "User"."lastActiveAt" IS NULL
    OR "User"."lastActiveAt" <= ${recentActivityFloor(now)}
  )
`;

const hourInOffset = (now: Date, offsetHours: number) =>
  (((now.getUTCHours() + offsetHours) % 24) + 24) % 24;

/**
 * The user's local hour, derived from longitude.
 *
 * Longitude over 15 is the solar offset, and it is deliberately the whole
 * timezone story here: a real tz lookup means shipping a coordinate-to-zone
 * dataset (tens of megabytes into a serverless bundle) to decide whether a
 * nudge goes out at 18:00 or 19:00. Political zones drift from solar time by
 * an hour or two at the edges, which the twelve hour send window absorbs, and
 * Brazil (where nearly all the users are) sits close to its solar offset.
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
 * Is now a decent moment to interrupt this user?
 *
 * With coordinates: any local hour outside 21:00 to 09:00. Without: only the
 * early evening America/Sao_Paulo slot, because guessing a whole day of
 * waking hours for someone whose location we do not know is how a retention
 * push becomes a 3am push.
 */
export const isWithinSendWindow = (
  longitude: number | null | undefined,
  now: Date,
): boolean => {
  const localHour = localHourFromLongitude(longitude, now);

  if (localHour === null) {
    return FALLBACK_SEND_HOURS.has(hourInOffset(now, FALLBACK_OFFSET_HOURS));
  }

  return localHour >= QUIET_HOURS_END && localHour < QUIET_HOURS_START;
};

type ReengagementCopyKey =
  | "server:notification.reengagement.unansweredMatch.title"
  | "server:notification.reengagement.unansweredMatch.body"
  | "server:notification.reengagement.newDogsNearby.title"
  | "server:notification.reengagement.newDogsNearby.body"
  | "server:notification.reengagement.likesWaiting.title"
  | "server:notification.reengagement.likesWaiting.body";

/**
 * The cron has no request to read a language from and `User` has no language
 * column, so every re-engagement push goes out in pt-BR, which is where
 * essentially all of the users are. A per-user language is the follow up, and
 * it belongs on the model rather than being guessed at here.
 */
const translate = (
  key: ReengagementCopyKey,
  replace?: Record<string, unknown>,
): string => TranslationService.translate(key, { lng: Language.PtBr, replace });

/**
 * Matches that went silent, one candidate per side that can be reached.
 *
 * Both sides get the nudge because either of them can break the silence and
 * neither knows the other is waiting.
 */
export const selectUnansweredMatchCandidates = async (
  now: Date,
): Promise<Candidate[]> => {
  const buckets = await Promise.all(
    UNANSWERED_MATCH_HOURS.map(async (hours, index) => {
      // Each bucket stops where the next one starts, so a four day old silent
      // match is only ever in the 72 hour bucket and never in both.
      const upperAgeHours =
        UNANSWERED_MATCH_HOURS[index + 1] ?? UNANSWERED_MATCH_MAX_AGE_HOURS;

      const olderThan = new Date(now.getTime() - hours * HOUR_MS);
      const newerThan = new Date(now.getTime() - upperAgeHours * HOUR_MS);

      const dogSelect = {
        id: true,
        name: true,
        user: {
          select: {
            id: true,
            pushToken: true,
            longitude: true,
            lastActiveAt: true,
          },
        },
      } as const;

      const matches = await prisma.match.findMany({
        where: {
          deletedAt: null,
          createdAt: { gte: newerThan, lt: olderThan },
          messages: { none: { deletedAt: null } },
          requester: {
            deletedAt: null,
            banned: false,
            user: { deletedAt: null },
          },
          responder: {
            deletedAt: null,
            banned: false,
            user: { deletedAt: null },
          },
        },
        select: {
          id: true,
          requester: { select: dogSelect },
          responder: { select: dogSelect },
        },
        // Newest first. The take is a ceiling on one run, and the rows most
        // likely to be already claimed by a dedupe key are the oldest ones, so
        // ordering the other way would let a backlog starve fresh matches.
        orderBy: { createdAt: "desc" },
        take: MAX_CANDIDATES_PER_QUERY,
      });

      return matches.flatMap((match) =>
        [
          { self: match.requester, other: match.responder },
          { self: match.responder, other: match.requester },
        ].flatMap(({ self, other }) =>
          self.user.pushToken && !isRecentlyActive(self.user.lastActiveAt, now)
            ? [
                {
                  kind: REENGAGEMENT_KINDS.UNANSWERED_MATCH,
                  userId: self.user.id,
                  pushToken: self.user.pushToken,
                  longitude: self.user.longitude,
                  dedupeKey: `${REENGAGEMENT_KINDS.UNANSWERED_MATCH}:${match.id}:${self.user.id}:${hours}h`,
                  title: translate(
                    "server:notification.reengagement.unansweredMatch.title",
                    { name: other.name },
                  ),
                  body: translate(
                    "server:notification.reengagement.unansweredMatch.body",
                    { name: other.name },
                  ),
                  url: `chat/${match.id}/${other.id}`,
                } satisfies Candidate,
              ]
            : [],
        ),
      );
    }),
  );

  return buckets.flat();
};

/**
 * A user we can actually reach.
 *
 * The empty string matters: `UserService.blacklistPushToken` clears a dead
 * token by writing `""` rather than null, so `IS NOT NULL` alone would keep
 * re-selecting users whose device has already been rejected by Expo, burning
 * their daily cap and inflating the sent count this whole change exists to
 * measure.
 */
const REACHABLE_USER = Prisma.sql`
  "User"."deletedAt" IS NULL
  AND "User"."pushToken" IS NOT NULL
  AND "User"."pushToken" <> ''
`;

/**
 * Has this user liked anybody since `since`? Correlates against the enclosing
 * query's `"User"` row, so it only composes inside the candidate select below.
 */
const swipedPositivelySince = (since: Date) => Prisma.sql`
  EXISTS (
    SELECT 1 FROM "Interest"
    JOIN "Dog" AS "OwnDog" ON "OwnDog"."id" = "Interest"."requesterId"
    WHERE "OwnDog"."userId" = "User"."id"
    AND "Interest"."lastPositiveAt" > ${since}
  )
`;

type NewDogsRow = {
  userId: string;
  pushToken: string;
  longitude: number | null;
  newDogs: number;
  requested: boolean;
  anchor: Date | null;
};

/**
 * Users worth pulling back into the deck, with the real number of dogs waiting
 * for them.
 *
 * Two ways in, and they are mutually exclusive so nobody is selected twice.
 * Either the user asked to be told (`newDogsAlertRequestedAt`, the fake door in
 * #191), in which case the inactivity rule does not apply and the count is
 * measured from the moment they asked; or they have gone quiet, in which case
 * they land in exactly one inactivity bucket. Both still need
 * {@link MIN_NEW_DOGS} dogs to exist: "come back, there is nothing new" is
 * worse than silence.
 *
 * The dog count mirrors the swipe deck's hard filters (opposite gender, not
 * banned or deleted, an approved image and no rejected one, inside the
 * preferred distance, not already swiped). The deck's soft preferences (color,
 * size, age, breed) are left out, so the number in the copy is an upper bound
 * when a user has set those.
 */
export const selectNewDogsNearbyCandidates = async (
  now: Date,
): Promise<Candidate[]> => {
  // Sliding, so a user who has never swiped is always shown a full window of
  // new dogs rather than an emptier and emptier one as a period runs out.
  const newDogsFloor = new Date(
    now.getTime() - NEW_DOGS_FALLBACK_WINDOW_DAYS * DAY_MS,
  );

  // Quantised, and used only to decide whether that cohort has already been
  // told this period. The dedupe key carries the same period number, so the
  // key and the filter re-admit the user on exactly the same day.
  const periodMs = NEW_DOGS_FALLBACK_WINDOW_DAYS * DAY_MS;
  const period = Math.floor(now.getTime() / periodMs);
  const periodStart = new Date(period * periodMs);

  const buckets = [
    {
      label: "requested",
      eligibility: Prisma.sql`"User"."newDogsAlertRequestedAt" IS NOT NULL`,
    },
    ...INACTIVE_DAYS.map((days, index) => {
      const nextDays = INACTIVE_DAYS[index + 1];

      // Each bucket ends where the next begins: quiet for 3 days but not yet 7
      // is the 3 day nudge, quiet for 7 or more is the 7 day one. Without the
      // lower bound a user who has been away a month is in both.
      const lowerBound = nextDays
        ? Prisma.sql`AND ${swipedPositivelySince(new Date(now.getTime() - nextDays * DAY_MS))}`
        : Prisma.empty;

      return {
        label: `${days}d`,
        eligibility: Prisma.sql`
          "User"."newDogsAlertRequestedAt" IS NULL
          AND ${notRecentlyActive(now)}
          AND NOT ${swipedPositivelySince(new Date(now.getTime() - days * DAY_MS))}
          ${lowerBound}
        `,
      };
    }),
  ];

  const rows = await Promise.all(
    buckets.map(({ label, eligibility }) =>
      prisma.$queryRaw<NewDogsRow[]>`
        WITH "candidate" AS (
          SELECT
            "User"."id" AS "userId",
            "User"."pushToken" AS "pushToken",
            "User"."longitude" AS "longitude",
            "User"."latitude" AS "latitude",
            ("User"."newDogsAlertRequestedAt" IS NOT NULL) AS "requested",
            /* Count from the moment they asked, otherwise from their last
               positive swipe, otherwise from a fixed floor. */
            COALESCE(
              "User"."newDogsAlertRequestedAt",
              (
                SELECT MAX("Interest"."lastPositiveAt")
                FROM "Interest"
                JOIN "Dog" AS "OwnDog" ON "OwnDog"."id" = "Interest"."requesterId"
                WHERE "OwnDog"."userId" = "User"."id"
              )
            ) AS "anchor",
            /* The viewer's own dog, used for the gender rule and the distance
               preference. */
            (
              SELECT "OwnDog"."id" FROM "Dog" AS "OwnDog"
              WHERE "OwnDog"."userId" = "User"."id"
              AND "OwnDog"."deletedAt" IS NULL AND "OwnDog"."banned" = false
              ORDER BY "OwnDog"."createdAt" ASC LIMIT 1
            ) AS "ownDogId"
          FROM "User"
          WHERE ${REACHABLE_USER}
          AND (${eligibility})
        )
        SELECT
          "candidate"."userId",
          "candidate"."pushToken",
          "candidate"."longitude",
          "candidate"."requested",
          "candidate"."anchor",
          "counted"."newDogs"
        FROM "candidate"
        JOIN "Dog" AS "OwnDog" ON "OwnDog"."id" = "candidate"."ownDogId"
        CROSS JOIN LATERAL (
          SELECT COUNT(*)::int AS "newDogs"
          FROM "Dog"
          JOIN "User" AS "Owner" ON "Owner"."id" = "Dog"."userId"
          WHERE "Dog"."userId" <> "candidate"."userId"
          AND "Dog"."deletedAt" IS NULL
          AND "Dog"."banned" = false
          AND "Owner"."deletedAt" IS NULL
          AND "Dog"."createdAt" > COALESCE("candidate"."anchor", ${newDogsFloor})
          AND "Dog"."gender" <> "OwnDog"."gender"
          /* Shadowban gate, same shape as the deck. */
          AND EXISTS (
            SELECT 1 FROM "Image"
            WHERE "Image"."dogId" = "Dog"."id"
            AND "Image"."status" = 'APPROVED'::"ImageStatus"
          )
          AND NOT EXISTS (
            SELECT 1 FROM "Image"
            WHERE "Image"."dogId" = "Dog"."id"
            AND "Image"."status" = 'REJECTED'::"ImageStatus"
          )
          /* Already swiped is already seen. */
          AND NOT EXISTS (
            SELECT 1 FROM "Interest"
            WHERE "Interest"."requesterId" = "OwnDog"."id"
            AND "Interest"."responderId" = "Dog"."id"
          )
          AND (
            /* Null and zero both mean "no preference" in SuggestionService,
               where the filter is only applied when the value is truthy.
               Reading zero as "within zero kilometres" here would silently
               empty the count for anyone who has it. */
            "OwnDog"."preferredMaxDistance" IS NULL
            OR "OwnDog"."preferredMaxDistance" <= 0
            OR "OwnDog"."preferredMaxDistance" >= ${UNLIMITED_DISTANCE_KM}
            OR "candidate"."latitude" IS NULL
            OR "candidate"."longitude" IS NULL
            OR "Owner"."latitude" IS NULL
            OR "Owner"."longitude" IS NULL
            OR ST_DistanceSphere(
              ST_MakePoint("Owner"."longitude", "Owner"."latitude"),
              ST_MakePoint("candidate"."longitude", "candidate"."latitude")
            ) / 1000 <= "OwnDog"."preferredMaxDistance"
          )
        ) AS "counted"
        WHERE "counted"."newDogs" >= ${MIN_NEW_DOGS}
        /* Already told since the anchor last moved, so there is nothing new to
           say. The dedupe key is built from the same anchor, which makes this a
           faithful pre-filter rather than a second policy: it keeps users who
           have had their nudge out of the candidate set instead of letting them
           occupy the limit forever, and it is what stops a cleared alert
           request from re-qualifying the user under the inactivity rule the
           next day. */
        AND NOT EXISTS (
          SELECT 1 FROM "NotificationLog"
          WHERE "NotificationLog"."userId" = "candidate"."userId"
          AND "NotificationLog"."kind" = ${REENGAGEMENT_KINDS.NEW_DOGS_NEARBY}
          AND "NotificationLog"."sentAt" > COALESCE("candidate"."anchor", ${periodStart})
        )
        /* Freshest lapsers first, for the same reason matches are ordered
           newest first. */
        ORDER BY "candidate"."anchor" DESC NULLS LAST
        LIMIT ${MAX_CANDIDATES_PER_QUERY}
      `.then((result) => ({ label, result })),
    ),
  );

  return rows.flatMap(({ label, result }) =>
    result.map((row) => ({
      kind: REENGAGEMENT_KINDS.NEW_DOGS_NEARBY,
      userId: row.userId,
      pushToken: row.pushToken,
      longitude: row.longitude,
      /* Keying on the anchor is what stops the nudge repeating: it only moves
         once the user swipes positively again or asks again. */
      dedupeKey: `${REENGAGEMENT_KINDS.NEW_DOGS_NEARBY}:${row.userId}:${label}:${row.anchor?.toISOString() ?? `never:${period}`}`,
      title: translate("server:notification.reengagement.newDogsNearby.title", {
        amount: row.newDogs,
      }),
      body: translate("server:notification.reengagement.newDogsNearby.body"),
      url: "swipe",
      clearsNewDogsAlert: row.requested,
    })),
  );
};

type LikesWaitingRow = {
  userId: string;
  pushToken: string;
  longitude: number | null;
  dogName: string;
  anchorId: string;
};

/**
 * Users sitting on likes they have not answered.
 *
 * `Interest` has no seen flag, so "unseen" is read as "not yet reciprocated":
 * an active like pointing at one of your dogs, older than a day, with no match
 * and nothing back from you. That is the set worth interrupting someone over.
 *
 * The dedupe key is the oldest waiting like, so the nudge does not repeat
 * until that particular like is dealt with.
 */
export const selectLikesWaitingCandidates = async (
  now: Date,
): Promise<Candidate[]> => {
  const olderThan = new Date(now.getTime() - LIKES_WAITING_HOURS * HOUR_MS);

  const rows = await prisma.$queryRaw<LikesWaitingRow[]>`
    WITH "waiting" AS (
      SELECT
        "User"."id" AS "userId",
        "User"."pushToken" AS "pushToken",
        "User"."longitude" AS "longitude",
        "Dog"."name" AS "dogName",
        (ARRAY_AGG("Interest"."id" ORDER BY "Interest"."createdAt" ASC))[1] AS "anchorId",
        MAX("Interest"."createdAt") AS "newestLikeAt"
      FROM "User"
      JOIN "Dog" ON "Dog"."userId" = "User"."id"
        AND "Dog"."deletedAt" IS NULL AND "Dog"."banned" = false
      JOIN "Interest" ON "Interest"."responderId" = "Dog"."id"
      /* The dog doing the liking has to be one the deck would still show,
         otherwise the push names somebody the user can never reach. */
      JOIN "Dog" AS "Admirer" ON "Admirer"."id" = "Interest"."requesterId"
        AND "Admirer"."deletedAt" IS NULL AND "Admirer"."banned" = false
      JOIN "User" AS "AdmirerUser" ON "AdmirerUser"."id" = "Admirer"."userId"
        AND "AdmirerUser"."deletedAt" IS NULL
      WHERE ${REACHABLE_USER}
      AND ${notRecentlyActive(now)}
      AND "Interest"."deletedAt" IS NULL
      AND "Interest"."matchId" IS NULL
      AND "Interest"."swipeType" IN ('INTERESTED'::"SwipeType", 'MAYBE'::"SwipeType")
      AND "Interest"."createdAt" < ${olderThan}
      /* Nothing back from this dog means the like is still unanswered. */
      AND NOT EXISTS (
        SELECT 1 FROM "Interest" AS "Reply"
        WHERE "Reply"."requesterId" = "Dog"."id"
        AND "Reply"."responderId" = "Interest"."requesterId"
        AND "Reply"."deletedAt" IS NULL
      )
      /* Shadowban gate on the admirer, same shape as the deck. */
      AND EXISTS (
        SELECT 1 FROM "Image"
        WHERE "Image"."dogId" = "Admirer"."id"
        AND "Image"."status" = 'APPROVED'::"ImageStatus"
      )
      AND NOT EXISTS (
        SELECT 1 FROM "Image"
        WHERE "Image"."dogId" = "Admirer"."id"
        AND "Image"."status" = 'REJECTED'::"ImageStatus"
      )
      GROUP BY "User"."id", "User"."pushToken", "User"."longitude", "Dog"."id", "Dog"."name"
    )
    SELECT
      "waiting"."userId",
      "waiting"."pushToken",
      "waiting"."longitude",
      "waiting"."dogName",
      "waiting"."anchorId"
    FROM "waiting"
    /* Rebuilds the dedupe key the caller would compute. A user whose oldest
       waiting like has already been announced stays out of the candidate set
       rather than occupying the limit until they finally answer it. */
    WHERE NOT EXISTS (
      SELECT 1 FROM "NotificationLog"
      WHERE "NotificationLog"."dedupeKey" =
        ${`${REENGAGEMENT_KINDS.LIKES_WAITING}:`} || "waiting"."userId" || ':' || "waiting"."anchorId"
    )
    ORDER BY "waiting"."newestLikeAt" DESC
    LIMIT ${MAX_CANDIDATES_PER_QUERY}
  `;

  return rows.map((row) => ({
    kind: REENGAGEMENT_KINDS.LIKES_WAITING,
    userId: row.userId,
    pushToken: row.pushToken,
    longitude: row.longitude,
    dedupeKey: `${REENGAGEMENT_KINDS.LIKES_WAITING}:${row.userId}:${row.anchorId}`,
    title: translate("server:notification.reengagement.likesWaiting.title", {
      name: row.dogName,
    }),
    body: translate("server:notification.reengagement.likesWaiting.body"),
    url: "swipe",
  }));
};

/**
 * Highest value first. A match nobody spoke on is one tap from a conversation;
 * an empty deck is the weakest of the three, so it only gets the slot when
 * nothing better is queued for that user.
 */
const collectCandidates = async (now: Date) => {
  const [unansweredMatch, likesWaiting, newDogsNearby] = await Promise.all([
    selectUnansweredMatchCandidates(now),
    selectLikesWaitingCandidates(now),
    selectNewDogsNearbyCandidates(now),
  ]);

  const byKey = new Map<string, Candidate>();
  for (const candidate of [
    ...unansweredMatch,
    ...likesWaiting,
    ...newDogsNearby,
  ]) {
    if (!byKey.has(candidate.dedupeKey))
      byKey.set(candidate.dedupeKey, candidate);
  }

  return [...byKey.values()];
};

const PRISMA_UNIQUE_VIOLATION = "P2002";

export class ReengagementService {
  /**
   * Select everyone who is due a nudge right now and enqueue one push each.
   *
   * Called once an hour by the Vercel Cron so the per-user local time window
   * can be honoured; this method is what decides who is actually due.
   */
  static async run(now = new Date()): Promise<ReengagementRunSummary> {
    const candidates = await collectCandidates(now);

    const summary: ReengagementRunSummary = {
      sent: 0,
      byKind: {
        [REENGAGEMENT_KINDS.UNANSWERED_MATCH]: 0,
        [REENGAGEMENT_KINDS.NEW_DOGS_NEARBY]: 0,
        [REENGAGEMENT_KINDS.LIKES_WAITING]: 0,
      },
      candidates: candidates.length,
      skippedQuietHours: 0,
      skippedCooldown: 0,
      skippedAlreadySent: 0,
      skippedUnreachable: 0,
    };

    if (candidates.length === 0) return summary;

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

    const unclaimed = candidates.filter((candidate) => {
      if (!claimedKeys.has(candidate.dedupeKey)) return true;
      summary.skippedAlreadySent += 1;
      return false;
    });

    // Priority order survives the grouping, so a user's queue runs best nudge
    // first. Only one of them will actually go out.
    const perUser = new Map<
      string,
      { longitude: number | null; queue: Candidate[] }
    >();
    for (const candidate of unclaimed) {
      const existing = perUser.get(candidate.userId);

      if (existing) existing.queue.push(candidate);
      else
        perUser.set(candidate.userId, {
          longitude: candidate.longitude,
          queue: [candidate],
        });
    }

    const due = [...perUser.entries()].filter(([, { longitude }]) => {
      if (isWithinSendWindow(longitude, now)) return true;
      summary.skippedQuietHours += 1;
      return false;
    });

    if (due.length === 0) return summary;

    const cooledDown = await prisma.notificationLog.findMany({
      where: {
        userId: { in: due.map(([userId]) => userId) },
        sentAt: {
          gt: new Date(now.getTime() - USER_COOLDOWN_HOURS * HOUR_MS),
        },
      },
      select: { userId: true },
    });

    const recentlyNudged = new Set(cooledDown.map(({ userId }) => userId));

    for (const [userId, { queue }] of due) {
      if (summary.sent >= MAX_PUSHES_PER_RUN) break;

      if (recentlyNudged.has(userId)) {
        summary.skippedCooldown += 1;
      } else {
        // oxlint-disable-next-line no-await-in-loop -- Each send claims its dedupe key first; running them in parallel would race the cooldown they enforce on each other.
        const sent = await ReengagementService.#sendFirstAvailable(
          queue,
          summary,
        );

        if (sent) recentlyNudged.add(userId);
      }
    }

    return summary;
  }

  /**
   * Walk one user's queue until a nudge actually goes out.
   *
   * The queue is already free of keys claimed before the run started; this
   * loop is what covers a key claimed *during* it, by another instance racing
   * the same candidate.
   */
  static async #sendFirstAvailable(
    queue: Candidate[],
    summary: ReengagementRunSummary,
  ): Promise<boolean> {
    for (const candidate of queue) {
      // A token Expo will reject is a guaranteed dropped push, and it is the
      // same token for every candidate this user has, so there is nothing left
      // to try. Counting it as sent would put it in the denominator of the
      // open rate, which is the number this whole change exists to produce.
      if (!Expo.isExpoPushToken(candidate.pushToken)) {
        summary.skippedUnreachable += 1;
        return false;
      }

      // oxlint-disable-next-line no-await-in-loop -- Sequential by design: the next candidate is only tried when this one turns out to be claimed.
      const outcome = await ReengagementService.#send(candidate);

      if (outcome === "sent") {
        summary.sent += 1;
        summary.byKind[candidate.kind] += 1;
        return true;
      }

      summary.skippedAlreadySent += 1;
    }

    return false;
  }

  /**
   * Claim the dedupe key, then send.
   *
   * The write comes first on purpose: a crash between the two costs one push,
   * while the other order costs a duplicate, and a duplicate re-engagement
   * push is the thing users uninstall over.
   */
  static async #send(candidate: Candidate): Promise<"sent" | "already-sent"> {
    try {
      await prisma.notificationLog.create({
        data: {
          userId: candidate.userId,
          kind: candidate.kind,
          dedupeKey: candidate.dedupeKey,
        },
      });
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
