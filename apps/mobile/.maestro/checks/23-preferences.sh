#!/usr/bin/env bash
# Post-check for flow 23 (preferences-journey.yaml — sliders only).
#
# Verifies the slider mutations persisted to the database.
#
# Schema reminder (psql \d "Dog"):
#   - preferredMinAge      integer  (nullable)
#   - preferredMaxAge      integer  (nullable; null == ∞ / no cap)
#   - preferredMaxDistance integer  (nullable; null == ∞ / no cap)
#
# Seed baseline (packages/database/maestro-seed.ts → ensureMagicUserWithRex):
#   preferredMinAge=1, preferredMaxAge=15, preferredMaxDistance=50
#
# The Preferences screen clamps:
#   - max age >= MAX_FILTER_AGE (10) is normalized to NULL (∞)
#   - max distance >= MAX_FILTER_DISTANCE (300) is normalized to NULL (∞)
# Both unsave on submit if unchanged. So the seed value
# preferredMaxAge=15 is actually returned by the API as NULL (since 15 > 10).
# After the slider flow drags the max-age marker LEFT off ∞ to ~Y 65%,
# the persisted preferredMaxAge becomes a concrete integer ≤ 9.
#
# Expected end state (proof of successful mutation):
#   - preferredMinAge      DIFFERS from the seed value 1 (the flow drags
#                          it right, so we assert > 1)
#   - preferredMaxAge      DIFFERS from the seed value NULL/15 (flow
#                          drags it left off ∞, so we assert IS NOT NULL
#                          AND < 10)
#   - preferredMaxDistance DIFFERS from the seed value 50 (flow drags it
#                          right, so we assert > 50 AND IS NOT NULL,
#                          i.e. still bounded — not the ∞ case)
#
# Returns exit 0 on PASS, non-zero on any miss with diagnostics to stderr.
#
# DATABASE_URL defaults to local dev Postgres on port 3356; override via
# the environment for CI.
set -euo pipefail

DATABASE_URL="${DATABASE_URL:-postgresql://tony:hawk@localhost:3356/pegada}"
TEST_EMAIL="${TEST_EMAIL:-test@pegada.app}"

ROW=$(psql "$DATABASE_URL" -tAc \
  "SELECT
     COALESCE(d.\"preferredMinAge\"::text, 'NULL') || '|' ||
     COALESCE(d.\"preferredMaxAge\"::text, 'NULL') || '|' ||
     COALESCE(d.\"preferredMaxDistance\"::text, 'NULL')
     FROM \"Dog\" d
     JOIN \"User\" u ON u.id = d.\"userId\"
     WHERE u.email = '$TEST_EMAIL' AND d.\"deletedAt\" IS NULL
     ORDER BY d.\"createdAt\" ASC LIMIT 1")

if [[ -z "$ROW" ]]; then
  echo "[check-23] FAIL — no Dog found for $TEST_EMAIL (seed broken?)" >&2
  exit 1
fi

IFS='|' read -r MIN_AGE MAX_AGE MAX_DIST <<< "$ROW"
echo "[check-23] Dog preferredMinAge=$MIN_AGE, preferredMaxAge=$MAX_AGE, preferredMaxDistance=$MAX_DIST"

fail=0

# preferredMinAge — seed value is 1, expect > 1 after right-drag.
if [[ "$MIN_AGE" == "NULL" ]]; then
  echo "[check-23] FAIL — expected preferredMinAge IS NOT NULL (> 1), got NULL" >&2
  fail=1
elif [[ "$MIN_AGE" -le 1 ]]; then
  echo "[check-23] FAIL — expected preferredMinAge > 1 (was 1 in seed), got $MIN_AGE" >&2
  fail=1
fi

# preferredMaxAge — seed value 15 is clamped to NULL (∞). Expect non-null
# and < 10 (since we drag the marker LEFT off the ∞ end).
if [[ "$MAX_AGE" == "NULL" ]]; then
  echo "[check-23] FAIL — expected preferredMaxAge IS NOT NULL (< 10), got NULL (slider never moved off ∞)" >&2
  fail=1
elif [[ "$MAX_AGE" -ge 10 ]]; then
  echo "[check-23] FAIL — expected preferredMaxAge < 10, got $MAX_AGE (still at or above MAX_FILTER_AGE)" >&2
  fail=1
fi

# preferredMaxDistance — seed value 50. Expect > 50 (drag right) and
# NOT NULL (not the ∞ case — slider didn't reach the MAX_FILTER_DISTANCE cap).
if [[ "$MAX_DIST" == "NULL" ]]; then
  echo "[check-23] FAIL — expected preferredMaxDistance IS NOT NULL (> 50), got NULL (slider hit ∞ cap)" >&2
  fail=1
elif [[ "$MAX_DIST" -le 50 ]]; then
  echo "[check-23] FAIL — expected preferredMaxDistance > 50 (was 50 in seed), got $MAX_DIST" >&2
  fail=1
fi

if [[ "$fail" -ne 0 ]]; then
  echo "[check-23] FAIL" >&2
  exit 1
fi
echo "[check-23] PASS"
