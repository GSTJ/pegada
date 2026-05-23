#!/usr/bin/env bash
# Post-check for flow 24 (profile-journey.yaml).
#
# Verifies the Edit Profile mutation actually wrote a new dog name to
# Postgres for test@pegada.app's Rex. The flow types a unique
# "Rex Maestro <timestamp>" so we can assert the name no longer matches
# the seeded literal "Rex" — proof the mutation hit the DB.
#
# We deliberately match a pattern (LIKE 'Rex Maestro %') rather than a
# fixed string because the flow encodes a per-run timestamp via
# `evalScript: output.profileJourney = { ts: Date.now() }`. The flow can
# rerun many times and the value drifts by design.
#
# Schema reminder:
#   User:  id, email, ...
#   Dog:   id, name, userId, deletedAt, ...
#
# Returns exit 0 on PASS, non-zero on any miss with diagnosis printed.
#
# DATABASE_URL defaults to local dev Postgres on port 3356; override via
# the environment for CI.
set -euo pipefail

DATABASE_URL="${DATABASE_URL:-postgresql://tony:hawk@localhost:3356/pegada}"
TEST_EMAIL="${TEST_EMAIL:-test@pegada.app}"
EXPECTED_PATTERN="${EXPECTED_PATTERN:-Rex-%}"

CURRENT_NAME=$(psql "$DATABASE_URL" -tAc \
  "SELECT d.name FROM \"Dog\" d
     JOIN \"User\" u ON u.id = d.\"userId\"
     WHERE u.email = '$TEST_EMAIL' AND d.\"deletedAt\" IS NULL
     ORDER BY d.\"createdAt\" ASC LIMIT 1")

if [[ -z "$CURRENT_NAME" ]]; then
  echo "[check-24] FAIL - no Dog row found for $TEST_EMAIL (seed broken?)" >&2
  exit 1
fi

echo "[check-24] current Rex name: '$CURRENT_NAME'"

MATCH_COUNT=$(psql "$DATABASE_URL" -tAc \
  "SELECT COUNT(*) FROM \"Dog\" d
     JOIN \"User\" u ON u.id = d.\"userId\"
     WHERE u.email = '$TEST_EMAIL' AND d.\"deletedAt\" IS NULL
       AND d.name LIKE '$EXPECTED_PATTERN'")

if [[ "$MATCH_COUNT" -lt 1 ]]; then
  echo "[check-24] FAIL - expected Dog.name LIKE '$EXPECTED_PATTERN', got '$CURRENT_NAME'" >&2
  echo "[check-24] this means the EditProfile mutation did not persist - check the save tap, validation errors, or the network." >&2
  exit 1
fi

if [[ "$CURRENT_NAME" == "Rex" ]]; then
  echo "[check-24] FAIL - Dog.name is still the seeded literal 'Rex' (mutation skipped)" >&2
  exit 1
fi

echo "[check-24] PASS - Rex name updated to '$CURRENT_NAME'"
