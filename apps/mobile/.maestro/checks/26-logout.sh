#!/usr/bin/env bash
# Post-check for flow 26 (logout-journey.yaml).
#
# Logout has NO server-side DB side effect — the JWT is wiped from the
# iOS Keychain client-side only. The functional "user is signed OUT
# after cold relaunch" verification lives inside the flow itself
# (sign-in screen screenshot + no post-login navigation).
#
# What we pin here is the NEGATIVE assertion: logout must NOT touch the
# account. A regression that hard-deletes or soft-deletes the user row
# on logout would otherwise ship green, because the flow only looks at
# the client. Cheap insurance, loud failure.
#
# DATABASE_URL defaults to local dev Postgres on port 3356; override via
# the environment for CI.
set -euo pipefail

DATABASE_URL="${DATABASE_URL:-postgresql://tony:hawk@localhost:3356/pegada}"
TEST_EMAIL="${TEST_EMAIL:-test@pegada.app}"

USER_COUNT=$(psql "$DATABASE_URL" -tAc \
  "SELECT COUNT(*) FROM \"User\"
     WHERE email = '$TEST_EMAIL' AND \"deletedAt\" IS NULL")

if [[ "$USER_COUNT" -ne 1 ]]; then
  echo "[check-26] FAIL - expected exactly 1 live User row for $TEST_EMAIL after logout, got '$USER_COUNT'" >&2
  echo "[check-26] logout must be client-side only; a delete here means the logout handler is calling the wrong mutation." >&2
  exit 1
fi

echo "[check-26] PASS - $TEST_EMAIL intact after logout (client-side only, as designed)"
