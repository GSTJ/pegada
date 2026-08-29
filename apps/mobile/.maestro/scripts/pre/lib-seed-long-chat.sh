#!/usr/bin/env bash
# Shared fixture for flows 43 and 44: a conversation long enough to scroll.
#
# Why a separate conversation and not Rex<->Bella: flows 11, 12, 19 and 34 all
# read the seeded Rex<->Bella thread — 34 back-dates every one of its messages,
# 19 asserts on the message it sends there — so growing it to 40 messages would
# change what four other flows are looking at. `maestro-seed.ts` also creates a
# Rex<->Nina match with ZERO messages, which is exactly the empty slot this
# fixture needs.
#
# Every row this inserts is tagged `chatux message NN`, which is what
# `cleanup-long-chat.sh` deletes. Nothing else in the schema is touched.
#
# The messages are stamped `now - (COUNT - n) minutes` so they all land on
# today: one "Today" separator at the top of the thread and none in between,
# which keeps the geometry the checks measure free of separator rows appearing
# and disappearing between runs.
set -euo pipefail

DATABASE_URL="${DATABASE_URL:-postgresql://tony:hawk@localhost:3356/pegada}"
COUNT="${CHATUX_MESSAGE_COUNT:-40}"

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -v count="$COUNT" -q <<'SQL'
WITH convo AS (
  SELECT m.id, m."requesterId", m."responderId"
  FROM "Match" m
  JOIN "Dog" r ON r.id = m."requesterId"
  JOIN "Dog" s ON s.id = m."responderId"
  WHERE m."deletedAt" IS NULL
    AND ((r.name = 'Rex' AND s.name = 'Nina') OR (r.name = 'Nina' AND s.name = 'Rex'))
  ORDER BY m."createdAt" ASC
  LIMIT 1
),
-- Delete first so the fixture is idempotent: re-running a flow must not
-- stack a second 40 messages on top of the first.
wipe AS (
  DELETE FROM "Message"
  WHERE "matchId" = (SELECT id FROM convo)
  RETURNING 1
),
series AS (SELECT generate_series(1, :count) AS n)
INSERT INTO "Message" (id, content, "createdAt", "senderId", "receiverId", "matchId")
SELECT
  gen_random_uuid()::text,
  'chatux message ' || lpad(series.n::text, 2, '0'),
  now() - (interval '1 minute' * (:count - series.n)),
  -- Alternate sides so the thread has both bubble variants, like a real one.
  CASE WHEN series.n % 2 = 1 THEN convo."requesterId" ELSE convo."responderId" END,
  CASE WHEN series.n % 2 = 1 THEN convo."responderId" ELSE convo."requesterId" END,
  convo.id
FROM series, convo
WHERE (SELECT count(*) FROM wipe) >= 0;
SQL

psql "$DATABASE_URL" -tAc \
  "SELECT count(*) FROM \"Message\" WHERE content LIKE 'chatux message %' AND \"deletedAt\" IS NULL" \
  | sed 's/^/[pre-chatux] long-chat fixture rows: /'
