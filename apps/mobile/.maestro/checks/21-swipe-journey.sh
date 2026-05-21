#!/usr/bin/env bash
# Post-check for flow 21 (swipe-journey.yaml).
#
# Verifies that the swipe stack journey persisted the expected Interest
# rows to Postgres for test@pegada.app's Rex.
#
# Schema reminder (psql \dt):
#   - There is NO Report table. The Report flow in
#     apps/mobile/src/views/DogProfile/index.tsx fires
#     `Linking.openURL("mailto:report@pegada.app...")` and then
#     `swipe.swipe.mutate({ swipeType: Dislike })` — so a "report" persists
#     ONLY as a NOT_INTERESTED Interest row on the reported dog.
#
# Expected end state (against the maestro-seed.ts baseline):
#   - >=2 NOT_INTERESTED interests from Rex (one for MatchMe step 4,
#     one for SwipeDog3 step 6, possibly one extra from the Report step 9
#     against whatever dog was on top after step 7).
#   - >=1 INTERESTED interest from Rex (SwipeDog2 step 5).
#   - >=1 MAYBE interest from Rex (SwipeDog4 step 7).
#
# Returns exit 0 on PASS, non-zero on any miss with a human-readable
# diagnosis printed to stderr.
#
# DATABASE_URL defaults to the local dev Postgres on port 3356; override
# via the environment for CI.
set -euo pipefail

DATABASE_URL="${DATABASE_URL:-postgresql://tony:hawk@localhost:3356/pegada}"
TEST_EMAIL="${TEST_EMAIL:-test@pegada.app}"

# Resolve Rex's dog id (the magic user's only active dog) so we can scope
# the Interest counts. Failing to find Rex is itself a flow failure —
# the seed should have ensured he exists before the maestro run started.
REX_ID=$(psql "$DATABASE_URL" -tAc \
  "SELECT d.id FROM \"Dog\" d
     JOIN \"User\" u ON u.id = d.\"userId\"
     WHERE u.email = '$TEST_EMAIL' AND d.\"deletedAt\" IS NULL
     ORDER BY d.\"createdAt\" ASC LIMIT 1")
if [[ -z "$REX_ID" ]]; then
  echo "[check-21] FAIL — no Dog found for $TEST_EMAIL (seed broken?)" >&2
  exit 1
fi
echo "[check-21] Rex.id=$REX_ID"

# Count interests by SwipeType where Rex is the REQUESTER (the swiping
# direction). Filter deletedAt IS NULL to ignore tombstoned rows from
# prior runs.
NOT_INTERESTED=$(psql "$DATABASE_URL" -tAc \
  "SELECT COUNT(*) FROM \"Interest\"
     WHERE \"requesterId\" = '$REX_ID'
       AND \"swipeType\" = 'NOT_INTERESTED'
       AND \"deletedAt\" IS NULL")
INTERESTED=$(psql "$DATABASE_URL" -tAc \
  "SELECT COUNT(*) FROM \"Interest\"
     WHERE \"requesterId\" = '$REX_ID'
       AND \"swipeType\" = 'INTERESTED'
       AND \"deletedAt\" IS NULL")
MAYBE=$(psql "$DATABASE_URL" -tAc \
  "SELECT COUNT(*) FROM \"Interest\"
     WHERE \"requesterId\" = '$REX_ID'
       AND \"swipeType\" = 'MAYBE'
       AND \"deletedAt\" IS NULL")

echo "[check-21] NOT_INTERESTED=$NOT_INTERESTED, INTERESTED=$INTERESTED, MAYBE=$MAYBE"

fail=0
if [[ "$NOT_INTERESTED" -lt 2 ]]; then
  echo "[check-21] FAIL — expected >=2 NOT_INTERESTED (MatchMe + SwipeDog3), got $NOT_INTERESTED" >&2
  fail=1
fi
if [[ "$INTERESTED" -lt 1 ]]; then
  echo "[check-21] FAIL — expected >=1 INTERESTED (SwipeDog2), got $INTERESTED" >&2
  fail=1
fi
if [[ "$MAYBE" -lt 1 ]]; then
  echo "[check-21] FAIL — expected >=1 MAYBE (SwipeDog4), got $MAYBE" >&2
  fail=1
fi

if [[ "$fail" -ne 0 ]]; then
  echo "[check-21] FAIL" >&2
  exit 1
fi
echo "[check-21] PASS"
