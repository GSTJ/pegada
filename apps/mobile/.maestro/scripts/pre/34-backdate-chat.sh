#!/usr/bin/env bash
# Pre-test setup for flow 34 (chat-day-separator.yaml).
#
# maestro-seed.ts stamps the Rex<->Bella messages at now-30min / now-5min, so
# the chat's day separator renders "Today" and says nothing about the date
# format. Back-date them to a day that is unambiguously
# `isThisYear && !isThisWeek && !isYesterday && !isToday`, which is the branch
# that formats an abbreviated weekday - the one the bug lived in.
#
# 45 days back satisfies that for ~87% of the year; in mid-January it would
# fall into the previous year and take the "d MMM, yyyy" branch instead, so
# the fallback is the 3rd of January. That is still this year, and it is only
# this-week/yesterday/today during the first ~10 days of January, which the
# flow's positive assertion tolerates by matching both shapes' "<n> <Mon>".
set -euo pipefail

DATABASE_URL="${DATABASE_URL:-postgresql://tony:hawk@localhost:3356/pegada}"

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q <<'SQL'
WITH target AS (
  SELECT CASE
    WHEN date_part('year', now() - interval '45 days') = date_part('year', now())
      THEN now() - interval '45 days'
    ELSE date_trunc('year', now()) + interval '2 days'
  END AS at
),
convo AS (
  SELECT m.id
  FROM "Match" m
  JOIN "Dog" r ON r.id = m."requesterId"
  JOIN "Dog" s ON s.id = m."responderId"
  WHERE m."deletedAt" IS NULL
    AND ((r.name = 'Rex' AND s.name = 'Bella') OR (r.name = 'Bella' AND s.name = 'Rex'))
  ORDER BY m."createdAt" ASC
  LIMIT 1
)
UPDATE "Message" msg
SET "createdAt" = target.at + (interval '1 minute' * ordered.rn)
FROM target,
     (SELECT id, row_number() OVER (ORDER BY "createdAt" ASC) AS rn
        FROM "Message"
       WHERE "matchId" = (SELECT id FROM convo) AND "deletedAt" IS NULL) AS ordered
WHERE msg.id = ordered.id;
SQL

psql "$DATABASE_URL" -tAc \
  "SELECT to_char(min(msg.\"createdAt\"), 'Dy DD Mon YYYY') FROM \"Message\" msg
     JOIN \"Match\" m ON m.id = msg.\"matchId\"
     JOIN \"Dog\" r ON r.id = m.\"requesterId\"
     JOIN \"Dog\" s ON s.id = m.\"responderId\"
    WHERE msg.\"deletedAt\" IS NULL
      AND ((r.name = 'Rex' AND s.name = 'Bella') OR (r.name = 'Bella' AND s.name = 'Rex'))" \
  | sed 's/^/[pre-34] Rex<->Bella conversation back-dated to /'
