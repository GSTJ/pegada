#!/bin/bash
# Maestro pre-test seed hook.
#
# Resets the local Postgres into a known-good state for every Maestro flow:
# 12+ dogs near SF, magic user test@pegada.app with dog Rex, a Rex<->Bella
# match with 2 messages, a Rex<->Nina match with an empty thread and four
# photos on Nina, Mel at the back of the deck, and OTP code=424242 for every
# test user.
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

# Drop the long-conversation fixture flows 43 and 44 seed into the otherwise
# empty Rex<->Nina match. `maestro:seed` is idempotent by not re-creating rows
# that exist, so without this those 40 messages survive their flow and every
# later run starts with Nina at the top of the Messages list — which is the row
# flow 12 taps by coordinate and flow 19 taps as `messages-chat-row`.
#
# Here rather than at the end of the two checks: a flow that fails never
# reaches its check, and the fixture has to be gone for the NEXT flow either
# way. `pre/43-seed-long-chat.sh` runs after this, so 43 and 44 still get it.
psql "$DATABASE_URL" -q -c \
  "DELETE FROM \"Message\" WHERE content LIKE 'chatux message %';" >/dev/null 2>&1 || true

echo "seeded"
