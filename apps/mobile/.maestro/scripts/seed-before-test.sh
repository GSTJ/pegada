#!/bin/bash
# Maestro pre-test seed hook.
#
# Resets the local Postgres into a known-good state for every Maestro flow:
# 12+ dogs near SF, magic user test@pegada.app with dog Rex, one match
# Rex<->Bella with 2 messages, and OTP code=424242 for every test user.
#
# Idempotent — re-running is a no-op modulo "Rex deck cleared" count.
#
# Called via Maestro's `- runScript:` step from inside login.yaml utils.
# Maestro invokes from the .maestro/ dir, so the cd into the repo root
# is explicit to make the pnpm invocation deterministic.
#
# DATABASE_URL is overridable (e.g. for CI / docker-compose test DB).
set -euo pipefail

# Resolve repo root from this script's location so the wrapper works
# from any worktree (the file lives at
# <repo>/apps/mobile/.maestro/scripts/seed-before-test.sh).
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../../.." && pwd)"
DATABASE_URL="${DATABASE_URL:-postgresql://tony:hawk@localhost:3356/pegada}"

cd "$REPO_ROOT"
DATABASE_URL="$DATABASE_URL" pnpm -F @pegada/database maestro:seed >/dev/null 2>&1
echo "seeded"
