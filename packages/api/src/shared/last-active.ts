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
 * life of the process.
 */
const MAX_TRACKED_USERS = 10_000;

/**
 * Keeps {@link lastWriteByUserId} bounded by {@link MAX_TRACKED_USERS}.
 *
 * Expired entries go first: they can never suppress a write, so they are pure
 * dead weight. If that is not enough, the oldest insertions are evicted until
 * the map fits. A `Map` iterates in insertion order and every entry is
 * inserted at write time, so the head of the iteration is the least recently
 * written user. Evicting one only costs a redundant `UPDATE` on that user's
 * next request, which the WHERE clause turns into zero rows changed.
 */
const enforceMapBudget = (now: number) => {
  if (lastWriteByUserId.size <= MAX_TRACKED_USERS) return;

  for (const [userId, writtenAt] of lastWriteByUserId) {
    if (now - writtenAt >= LAST_ACTIVE_THROTTLE_MS) {
      lastWriteByUserId.delete(userId);
    }
  }

  for (const userId of lastWriteByUserId.keys()) {
    if (lastWriteByUserId.size <= MAX_TRACKED_USERS) break;
    lastWriteByUserId.delete(userId);
  }
};

type LastActiveDatabase = Pick<PrismaClient, "$executeRaw">;

/**
 * Records that an authenticated request arrived for `userId`, at most once per
 * {@link LAST_ACTIVE_THROTTLE_MS} per user.
 *
 * Fire and forget on purpose: analytics must never be able to slow down or
 * fail a request that would otherwise have succeeded, so the promise is not
 * awaited, and neither a rejection nor a synchronous throw escapes.
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
  enforceMapBudget(now);

  const activeAt = new Date(now);
  const staleBefore = new Date(now - LAST_ACTIVE_THROTTLE_MS);

  try {
    // Raw SQL rather than `updateMany`, for one reason: `User.updatedAt` is
    // `@updatedAt`, so any Prisma write to the row rewrites it. Routing
    // activity through Prisma would move `updatedAt` every 10 minutes for
    // every active user and quietly destroy the only signal for "this profile
    // was last edited". This statement touches one column.
    //
    // The freshness condition lives in the WHERE clause rather than in a read
    // followed by a write: two instances that both believe the row is stale
    // race on a condition the database evaluates, and the loser updates zero
    // rows instead of overwriting a value that was already current.
    //
    // `deletedAt IS NULL` because this runs in `enforceUserIsAuthed`, ahead of
    // the `enforceUserIsActive` check that a protected procedure would make.
    // A deleted account still holds a valid token until it expires, and
    // counting it as active would inflate every retention number here.
    void db.$executeRaw`UPDATE "User" SET "lastActiveAt" = ${activeAt} WHERE "id" = ${userId} AND "deletedAt" IS NULL AND ("lastActiveAt" IS NULL OR "lastActiveAt" < ${staleBefore})`.catch(
      (error: unknown) => {
        // A failed write means one lost data point in a report, so it is
        // reported and dropped. Clearing the map entry would retry on the next
        // request, which is exactly the hammering this exists to prevent.
        sendError(error, { context: "touchLastActiveAt", userId });
      },
    );
  } catch (error) {
    // A driver can throw before it ever returns a promise (no connection in
    // the pool, a client shutting down). Same handling: report and carry on.
    sendError(error, { context: "touchLastActiveAt", userId });
  }
};
