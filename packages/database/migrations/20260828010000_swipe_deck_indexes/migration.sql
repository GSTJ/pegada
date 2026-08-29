-- Index work for the swipe deck's candidate query
-- (packages/api/src/services/SuggestionService/suggestion-service.ts).
--
-- Two composites added, two exact duplicates of a primary key dropped. No
-- table, column, constraint or query changes: every statement here is
-- invisible to application behaviour and only moves the planner.
--
-- ┌─────────────────────────────────────────────────────────────────────────┐
-- │ OPERATIONAL NOTE -- READ BEFORE DEPLOYING TO PRODUCTION                  │
-- │                                                                         │
-- │ These are plain (non-CONCURRENT) CREATE INDEXes, so each one holds a     │
-- │ SHARE lock on its table for the duration of the build: reads continue,   │
-- │ WRITES BLOCK. On the dev dataset that is milliseconds and on the         │
-- │ 100 000-dog / 400 000-image benchmark used to justify them it is a few   │
-- │ seconds, but it scales with the table.                                   │
-- │                                                                         │
-- │ CONCURRENTLY is not an option inside a migration: `prisma migrate`       │
-- │ wraps the file in a transaction and Postgres rejects both CREATE INDEX   │
-- │ CONCURRENTLY and DROP INDEX CONCURRENTLY there (verified: SQLSTATE       │
-- │ 25001). If the write pause is unacceptable, build them by hand first --  │
-- │                                                                         │
-- │   CREATE INDEX CONCURRENTLY "Image_dogId_status_idx"                     │
-- │     ON "Image" ("dogId", "status");                                      │
-- │   CREATE INDEX CONCURRENTLY "Interest_requesterId_responderId_idx"       │
-- │     ON "Interest" ("requesterId", "responderId");                        │
-- │                                                                         │
-- │ -- and the IF NOT EXISTS below turns this migration into a no-op. If a   │
-- │ CONCURRENTLY build is interrupted it leaves an INVALID index that        │
-- │ IF NOT EXISTS will happily skip, so check                                │
-- │ `SELECT indexrelid::regclass FROM pg_index WHERE NOT indisvalid;`        │
-- │ before relying on it.                                                    │
-- └─────────────────────────────────────────────────────────────────────────┘

-- The shadow-ban gate: `EXISTS (dogId = ? AND status = 'APPROVED')` and
-- `NOT EXISTS (dogId = ? AND status = 'REJECTED')`, evaluated once per
-- candidate dog, plus the json_agg of approved images for each dog returned.
-- Today `image_dogid_idx` matches on dogId and then fetches the heap tuple to
-- read `status`. Measured on 100 000 dogs / 400 000 images, the plan node goes
-- from `Index Scan using image_dogid_idx` to
-- `Index Only Scan using Image_dogId_status_idx`.
CREATE INDEX IF NOT EXISTS "Image_dogId_status_idx" ON "Image" ("dogId", "status");

-- "Exclude dogs you have already liked or disliked": filters `requesterId` and
-- `responderId` together, once per candidate dog. `interest_requesterid_idx`
-- alone matches every dog the viewer has ever swiped and filters from there.
-- Measured on 600 000 interests, the plan node goes from
-- `Index Scan using interest_requesterid_idx` to
-- `Index Scan using Interest_requesterId_responderId_idx`.
CREATE INDEX IF NOT EXISTS "Interest_requesterId_responderId_idx" ON "Interest" ("requesterId", "responderId");

-- `Dog_id_idx` and `User_id_idx` are btrees on the primary-key column of a
-- table that already has a primary-key btree on exactly that column. The
-- planner can never prefer them over the pkey, and every insert, update and
-- delete maintains them anyway. Pure write amplification.
DROP INDEX IF EXISTS "Dog_id_idx";
DROP INDEX IF EXISTS "User_id_idx";
