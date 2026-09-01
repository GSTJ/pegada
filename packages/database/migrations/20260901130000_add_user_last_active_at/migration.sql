-- Records the last time an authenticated request arrived for a user, written
-- at most once per 10 minutes per user by the tRPC authenticated middleware
-- (packages/api/src/trpc.ts). It is the column DAU/WAU, D7/D30 retention and
-- dormant-subscriber reporting read; nothing is exposed to the client.
--
-- Additive and nullable, so existing rows keep working and no backfill runs:
-- every user starts as NULL and gets a value on their next authenticated
-- request. Reports should read NULL as "not seen since this shipped".
ALTER TABLE "User" ADD COLUMN "lastActiveAt" TIMESTAMP(3);

-- Every reporting query filters on this column and nothing else
-- (`lastActiveAt >= now() - interval '7 days'`, `lastActiveAt < now() -
-- interval '14 days'`), so a single-column btree is what those scans need.
-- Plain, not CONCURRENTLY: `prisma migrate` wraps the file in a transaction
-- and Postgres rejects CREATE INDEX CONCURRENTLY there. The column is new, so
-- every value is NULL and the build is near-instant regardless of table size.
CREATE INDEX "User_lastActiveAt_idx" ON "User"("lastActiveAt");
