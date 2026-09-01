import type { PrismaClient } from "@prisma/client";

import { sendError } from "../errors/errors";

/**
 * How stale `User.lastActiveAt` is allowed to get before another write is
 * worth making. Retention reporting buckets by day, so 10 minutes of drift
 * costs nothing and turns a per-request write into roughly one write per user
 * per session.
 */
export const LAST_ACTIVE_THROTTLE_MS = 10 * 60 * 1000;

/**
 * Per-instance record of "we already issued a write for this user recently".
 *
 * The session comes from a JWT, so no user row is loaded on the authenticated
 * path and there is no `lastActiveAt` to compare against without an extra
 * read. This map is the cheap half of the throttle: it stops repeat writes
 * from the same warm instance without touching the database at all.
 *
 * It is deliberately not the whole answer. Every serverless instance starts
 * with an empty map, and a user with the app open hits several of them, so the
 * write itself carries the same 10 minute condition in SQL
 * ({@link touchLastActiveAt}). The map saves round trips; the WHERE clause is
 * what actually bounds the writes.
 */
const lastWriteByUserId = new Map<string, number>();

/**
 * Instances are recycled, but a busy one can stay warm for hours, and a map
 * keyed by user id would otherwise grow with every distinct visitor for the
 * life of the process. Entries older than the throttle window can never
 * suppress a write, so they are dead weight: drop them once the map is large
 * enough for the sweep to be worth its own cost.
 */
const MAX_TRACKED_USERS = 10_000;

const pruneExpired = (now: number) => {
  if (lastWriteByUserId.size < MAX_TRACKED_USERS) return;

  for (const [userId, writtenAt] of lastWriteByUserId) {
    if (now - writtenAt >= LAST_ACTIVE_THROTTLE_MS) {
      lastWriteByUserId.delete(userId);
    }
  }
};

type LastActiveDatabase = Pick<PrismaClient, "user">;

/**
 * Records that an authenticated request arrived for `userId`, at most once per
 * {@link LAST_ACTIVE_THROTTLE_MS} per user.
 *
 * Fire and forget on purpose: analytics must never be able to slow down or
 * fail a request that would otherwise have succeeded, so the promise is not
 * awaited and a rejection is reported rather than thrown.
 */
export const touchLastActiveAt = (
  db: LastActiveDatabase,
  userId: string,
): void => {
  const now = Date.now();
  const lastWrite = lastWriteByUserId.get(userId);

  if (lastWrite !== undefined && now - lastWrite < LAST_ACTIVE_THROTTLE_MS) {
    return;
  }

  // Recorded before the write resolves, so a burst of concurrent requests on
  // this instance issues one query rather than one per request.
  lastWriteByUserId.set(userId, now);
  pruneExpired(now);

  const staleBefore = new Date(now - LAST_ACTIVE_THROTTLE_MS);

  // `updateMany` with the freshness condition in the WHERE clause rather than
  // `update`: two instances that both believe the row is stale then race on a
  // condition the database evaluates, and the loser writes nothing instead of
  // overwriting a value that was already current.
  void db.user
    .updateMany({
      where: {
        id: userId,
        OR: [{ lastActiveAt: null }, { lastActiveAt: { lt: staleBefore } }],
      },
      data: { lastActiveAt: new Date(now) },
    })
    .catch((error: unknown) => {
      // A failed write means one lost data point in a report, so it is
      // reported and dropped. Clearing the map entry would retry on the next
      // request, which is exactly the hammering this exists to prevent.
      sendError(error, { context: "touchLastActiveAt", userId });
    });
};
