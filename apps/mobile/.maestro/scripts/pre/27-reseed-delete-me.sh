#!/usr/bin/env bash
# Pre-test setup for flow 27 (delete-account-journey.yaml).
#
# WHY this exists: the delete-account flow HARD-deletes
# delete-me@pegada.app. The shared `maestro:seed` step run by
# scripts/seed-before-test.sh does NOT recreate this user (only
# test@pegada.app + MatchMe + Bella + swipe pool), so the second
# consecutive run of flow 27 would land on the email screen and the
# OTP submit would fail because the user does not exist.
#
# This script invokes the dedicated `seed-delete-me` subcommand which
#   1. Calls purgeDeleteMeUser() to drop any stale row.
#   2. Creates a fresh delete-me@pegada.app with a single Shih-tzu
#      dog so the auth router lands on tabs (not CreateProfile).
#   3. Sets the magic OTP (424242) implicitly via the magic-email path.
#
# Idempotent - safe to re-run between attempts.
#
# DATABASE_URL is overridable for CI / docker-compose.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../../../.." && pwd)"
DATABASE_URL="${DATABASE_URL:-postgresql://tony:hawk@localhost:3356/pegada}"

cd "$REPO_ROOT"

# Re-seed delete-me. The tsx subcommand is `seed-delete-me`, not the
# `maestro:purge` script alias - the alias points at a non-existent
# `purge` subcommand (see packages/database/package.json), so we shell
# out to tsx directly.
DATABASE_URL="$DATABASE_URL" pnpm -F @pegada/database exec tsx ./maestro-seed.ts seed-delete-me

# Verify the row landed. Defensive guard: if the seed failed silently
# (e.g. a Breed FK that no longer exists) the downstream login flow
# would loop forever on the OTP screen with no obvious cause.
COUNT=$(psql "$DATABASE_URL" -tA -c "
  SELECT COUNT(*) FROM \"User\" WHERE email = 'delete-me@pegada.app' AND \"deletedAt\" IS NULL
")

if [[ "$COUNT" -ne 1 ]]; then
  echo "[pre-27] FAIL - expected 1 delete-me@pegada.app user, got $COUNT" >&2
  exit 1
fi

echo "[pre-27] PASS - delete-me@pegada.app re-seeded ($COUNT row)"
