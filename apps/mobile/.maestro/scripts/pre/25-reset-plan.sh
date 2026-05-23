#!/usr/bin/env bash
# Pre-test setup for flow 25 (upgrade-journey.yaml).
#
# WHY this exists: in CI mock-mode the upgrade flow grants PREMIUM to
# test@pegada.app via the maestroGrantPremium tRPC mutation. The shared
# maestro:seed step run by seed-before-test.sh does NOT reset
# User.plan back to FREE - so without this pre-script the second
# consecutive run would land on Profile with the user already PREMIUM,
# the upgrade CTA hidden, and the flow's "starting state" assertion
# would fire on the wrong UI.
#
# This script just runs UPDATE "User" SET plan='FREE' for the test
# user. It is intentionally narrow (does not touch any other row).
#
# Idempotent - safe to re-run.
#
# DATABASE_URL is overridable for CI / docker-compose.
set -euo pipefail

DATABASE_URL="${DATABASE_URL:-postgresql://tony:hawk@localhost:3356/pegada}"
TEST_EMAIL="${TEST_EMAIL:-test@pegada.app}"

psql "$DATABASE_URL" -tA -c "
  UPDATE \"User\" SET plan = 'FREE' WHERE email = '$TEST_EMAIL'
" >/dev/null

PLAN=$(psql "$DATABASE_URL" -tA -c "
  SELECT plan FROM \"User\" WHERE email = '$TEST_EMAIL'
")

if [[ "$PLAN" != "FREE" ]]; then
  echo "[pre-25] FAIL - $TEST_EMAIL plan is '$PLAN', expected FREE" >&2
  exit 1
fi

echo "[pre-25] PASS - $TEST_EMAIL reset to plan=FREE"
