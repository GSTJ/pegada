ALTER TABLE "Interest" ADD COLUMN "lastPositiveAt" TIMESTAMP(3);

UPDATE "Interest"
SET "lastPositiveAt" = "updatedAt"
WHERE "swipeType" IN ('INTERESTED', 'MAYBE');

-- Carry the newest positive swipe onto the row that survives deduplication.
WITH positive_history AS (
  SELECT
    "requesterId",
    "responderId",
    MAX("lastPositiveAt") AS "lastPositiveAt"
  FROM "Interest"
  GROUP BY "requesterId", "responderId"
)
UPDATE "Interest" AS interest
SET "lastPositiveAt" = positive_history."lastPositiveAt"
FROM positive_history
WHERE
  interest."requesterId" = positive_history."requesterId"
  AND interest."responderId" = positive_history."responderId";

-- Keep one canonical row for each directional dog pair before adding the
-- uniqueness constraint. Prefer an active row, then the most recent one.
WITH ranked AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "requesterId", "responderId"
      ORDER BY
        ("deletedAt" IS NULL) DESC,
        "updatedAt" DESC,
        "createdAt" DESC,
        "id" DESC
    ) AS position
  FROM "Interest"
)
DELETE FROM "Interest"
WHERE "id" IN (SELECT "id" FROM ranked WHERE position > 1);

DROP INDEX IF EXISTS "Interest_requesterId_responderId_idx";

CREATE UNIQUE INDEX "interest_requester_responder_key"
ON "Interest"("requesterId", "responderId");

CREATE INDEX "Interest_requesterId_lastPositiveAt_idx"
ON "Interest"("requesterId", "lastPositiveAt");
