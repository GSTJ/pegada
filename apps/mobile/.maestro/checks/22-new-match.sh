#!/usr/bin/env bash
# Post-check for flow 22 (new-match-journey.yaml).
#
# Verifies that the new-match journey actually persisted the expected rows
# to Postgres for test@pegada.app's Rex ↔ MatchMe pair.
#
# Schema reminder (psql \d "Match" / \d "Message"):
#   Match:   id, requesterId, responderId, createdAt, updatedAt, deletedAt
#            (no direct dogId/email fields — JOIN through "Dog" → "User")
#   Message: id, content, createdAt, deletedAt, senderId, receiverId, matchId
#
# Seed contract (packages/database/maestro-seed.ts):
#   ensureMatchMeWithPreLike() DELETES every prior Match/Message/Interest
#   between Rex and MatchMe before every run. So at the START of this flow
#   there are ZERO Match rows linking them. A passing flow MUST create
#   exactly one new Match row + at least one Message row.
#
# Expected end state:
#   - ≥1 Match row between Rex and MatchMe (deletedAt IS NULL).
#   - ≥1 Message row whose matchId JOINs to that Match AND whose content
#     starts with "MATCH22_" (the unique prefix the flow types).
#
# Returns exit 0 on PASS, non-zero on any miss with a human-readable
# diagnosis printed to stderr.
#
# DATABASE_URL defaults to the local dev Postgres on port 3356; override
# via the environment for CI.
set -euo pipefail

DATABASE_URL="${DATABASE_URL:-postgresql://tony:hawk@localhost:3356/pegada}"
TEST_EMAIL="${TEST_EMAIL:-test@pegada.app}"
MATCHME_EMAIL="${MATCHME_EMAIL:-test+matchme@pegada.app}"
MESSAGE_PREFIX="${MESSAGE_PREFIX:-MATCH22\_%}"

# Resolve Rex's dog id (test@pegada.app's only active dog).
REX_ID=$(psql "$DATABASE_URL" -tAc \
  "SELECT d.id FROM \"Dog\" d
     JOIN \"User\" u ON u.id = d.\"userId\"
     WHERE u.email = '$TEST_EMAIL' AND d.\"deletedAt\" IS NULL
     ORDER BY d.\"createdAt\" ASC LIMIT 1")
if [[ -z "$REX_ID" ]]; then
  echo "[check-22] FAIL — no Dog found for $TEST_EMAIL (seed broken?)" >&2
  exit 1
fi
echo "[check-22] Rex.id=$REX_ID"

# Resolve MatchMe's dog id (seeded under test+matchme@pegada.app).
MATCHME_ID=$(psql "$DATABASE_URL" -tAc \
  "SELECT d.id FROM \"Dog\" d
     JOIN \"User\" u ON u.id = d.\"userId\"
     WHERE u.email = '$MATCHME_EMAIL' AND d.\"deletedAt\" IS NULL
       AND d.name = 'MatchMe'
     ORDER BY d.\"createdAt\" ASC LIMIT 1")
if [[ -z "$MATCHME_ID" ]]; then
  echo "[check-22] FAIL — no MatchMe Dog found for $MATCHME_EMAIL (seed broken?)" >&2
  exit 1
fi
echo "[check-22] MatchMe.id=$MATCHME_ID"

# Match row between Rex and MatchMe (either direction).
MATCH_COUNT=$(psql "$DATABASE_URL" -tAc \
  "SELECT COUNT(*) FROM \"Match\"
     WHERE \"deletedAt\" IS NULL
       AND (
         (\"requesterId\" = '$REX_ID' AND \"responderId\" = '$MATCHME_ID')
         OR (\"requesterId\" = '$MATCHME_ID' AND \"responderId\" = '$REX_ID')
       )")

# Message row with our unique prefix that JOINs back to a Rex↔MatchMe Match.
# The LIKE pattern uses backslash to escape the underscore as a literal so
# Postgres doesn't treat it as a single-char wildcard. The default
# MESSAGE_PREFIX above already includes the escape.
MESSAGE_COUNT=$(psql "$DATABASE_URL" -tAc \
  "SELECT COUNT(*) FROM \"Message\" m
     JOIN \"Match\" mt ON mt.id = m.\"matchId\"
     WHERE m.\"deletedAt\" IS NULL
       AND m.content LIKE '$MESSAGE_PREFIX' ESCAPE '\\'
       AND mt.\"deletedAt\" IS NULL
       AND (
         (mt.\"requesterId\" = '$REX_ID' AND mt.\"responderId\" = '$MATCHME_ID')
         OR (mt.\"requesterId\" = '$MATCHME_ID' AND mt.\"responderId\" = '$REX_ID')
       )")

echo "[check-22] Match(Rex↔MatchMe)=$MATCH_COUNT, Message(MATCH22_*)=$MESSAGE_COUNT"

fail=0
if [[ "$MATCH_COUNT" -lt 1 ]]; then
  echo "[check-22] FAIL — expected ≥1 Match between Rex and MatchMe, got $MATCH_COUNT" >&2
  fail=1
fi
if [[ "$MESSAGE_COUNT" -lt 1 ]]; then
  echo "[check-22] FAIL — expected ≥1 Message with prefix MATCH22_ on a Rex↔MatchMe Match, got $MESSAGE_COUNT" >&2
  fail=1
fi

if [[ "$fail" -ne 0 ]]; then
  echo "[check-22] FAIL" >&2
  exit 1
fi
echo "[check-22] PASS"
