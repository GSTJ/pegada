import prisma from "@pegada/database";
import { Language } from "@pegada/shared/i18n/types/types";
import { Prisma } from "@prisma/client";

import { sendError } from "../errors/errors";
import { observability } from "../shared/observability";
import { PushNotificationService } from "./push-notification-service";
import { TranslationService } from "./translation-service";

export const REENGAGEMENT_KINDS = {
  UNANSWERED_MATCH: "unanswered_match",
  NEW_DOGS_NEARBY: "new_dogs_nearby",
  LIKES_WAITING: "likes_waiting",
} as const;

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

/** New dogs that have to exist nearby before the nudge is worth sending. */
export const MIN_NEW_DOGS = 3;

/** How old a like has to be before it counts as waiting. */
const LIKES_WAITING_HOURS = 24;

/**
 * When a user has never swiped positively there is no anchor to count new dogs
 * from, so the count starts here instead.
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

/** America/Sao_Paulo, for users whose coordinates we do not have. */
const FALLBACK_OFFSET_HOURS = -3;
const FALLBACK_SEND_HOUR = 18;

/** One re-engagement push per user per rolling day. */
const USER_COOLDOWN_HOURS = 24;

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
};

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
 * single 18:00 America/Sao_Paulo slot, because guessing a whole day of
 * waking hours for someone whose location we do not know is how a retention
 * push becomes a 3am push.
 */
export const isWithinSendWindow = (
  longitude: number | null | undefined,
  now: Date,
): boolean => {
  const localHour = localHourFromLongitude(longitude, now);

  if (localHour === null) {
    return hourInOffset(now, FALLBACK_OFFSET_HOURS) === FALLBACK_SEND_HOUR;
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
        user: { select: { id: true, pushToken: true, longitude: true } },
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
        orderBy: { createdAt: "asc" },
        take: MAX_CANDIDATES_PER_QUERY,
      });

      return matches.flatMap((match) =>
        [
          { self: match.requester, other: match.responder },
          { self: match.responder, other: match.requester },
        ].flatMap(({ self, other }) =>
          self.user.pushToken
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
  const newDogsFloor = new Date(
    now.getTime() - NEW_DOGS_FALLBACK_WINDOW_DAYS * DAY_MS,
  );

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
          WHERE "User"."deletedAt" IS NULL
          AND "User"."pushToken" IS NOT NULL
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
            "OwnDog"."preferredMaxDistance" IS NULL
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
      dedupeKey: `${REENGAGEMENT_KINDS.NEW_DOGS_NEARBY}:${row.userId}:${label}:${row.anchor?.toISOString() ?? "never"}`,
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
    SELECT
      "User"."id" AS "userId",
      "User"."pushToken" AS "pushToken",
      "User"."longitude" AS "longitude",
      "Dog"."name" AS "dogName",
      (ARRAY_AGG("Interest"."id" ORDER BY "Interest"."createdAt" ASC))[1] AS "anchorId"
    FROM "User"
    JOIN "Dog" ON "Dog"."userId" = "User"."id"
      AND "Dog"."deletedAt" IS NULL AND "Dog"."banned" = false
    JOIN "Interest" ON "Interest"."responderId" = "Dog"."id"
    WHERE "User"."deletedAt" IS NULL
    AND "User"."pushToken" IS NOT NULL
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
    /* A like from a dog the deck would never show is not worth a push. */
    AND EXISTS (
      SELECT 1 FROM "Image"
      WHERE "Image"."dogId" = "Interest"."requesterId"
      AND "Image"."status" = 'APPROVED'::"ImageStatus"
    )
    GROUP BY "User"."id", "User"."pushToken", "User"."longitude", "Dog"."id", "Dog"."name"
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
    };

    if (candidates.length === 0) return summary;

    // One push per user per run, before the cooldown is even consulted.
    const perUser = new Map<string, Candidate>();
    for (const candidate of candidates) {
      if (!perUser.has(candidate.userId))
        perUser.set(candidate.userId, candidate);
    }

    const due = [...perUser.values()].filter((candidate) => {
      if (isWithinSendWindow(candidate.longitude, now)) return true;
      summary.skippedQuietHours += 1;
      return false;
    });

    if (due.length === 0) return summary;

    const cooledDown = await prisma.notificationLog.findMany({
      where: {
        userId: { in: due.map(({ userId }) => userId) },
        sentAt: {
          gte: new Date(now.getTime() - USER_COOLDOWN_HOURS * HOUR_MS),
        },
      },
      select: { userId: true },
    });

    const recentlyNudged = new Set(cooledDown.map(({ userId }) => userId));

    for (const candidate of due) {
      if (summary.sent >= MAX_PUSHES_PER_RUN) break;

      if (recentlyNudged.has(candidate.userId)) {
        summary.skippedCooldown += 1;
      } else {
        // oxlint-disable-next-line no-await-in-loop -- Each send claims its dedupe key first; running them in parallel would race the cooldown they enforce on each other.
        const outcome = await ReengagementService.#send(candidate);

        if (outcome === "already-sent") {
          summary.skippedAlreadySent += 1;
        } else {
          recentlyNudged.add(candidate.userId);
          summary.sent += 1;
          summary.byKind[candidate.kind] += 1;
        }
      }
    }

    return summary;
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

    observability.capture("reengagement_push_sent", {
      distinctId: candidate.userId,
      kind: candidate.kind,
      dedupeKey: candidate.dedupeKey,
    });

    return "sent";
  }
}
