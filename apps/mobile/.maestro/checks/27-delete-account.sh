#!/usr/bin/env bash
# Post-check for flow 27 (delete-account-journey.yaml).
#
# Verifies the in-app Delete Account flow HARD-deleted the
# delete-me@pegada.app user row plus every dependent record. App Store
# Guideline 5.1.1(v) requires actual account deletion, not soft delete.
#
# What `user.deleteMe` should remove server-side (see
# packages/api/src/routes/user.ts):
#   - User row (FK constraint cascades to dogs, images, matches,
#     interests, messages).
#   - All session / token records.
#
# This check asserts the User row is gone. If it remains, either the
# mutation never fired (UI didn't reach the alert), or the server-side
# delete failed silently.
#
# DATABASE_URL defaults to local dev Postgres on port 3356; override
# for CI.
set -euo pipefail

DATABASE_URL="${DATABASE_URL:-postgresql://tony:hawk@localhost:3356/pegada}"
DELETE_ME_EMAIL="${DELETE_ME_EMAIL:-delete-me@pegada.app}"

COUNT=$(psql "$DATABASE_URL" -tA -c "
  SELECT COUNT(*) FROM \"User\" WHERE email = '$DELETE_ME_EMAIL'
")

if [[ "$COUNT" -ne 0 ]]; then
  echo "[check-27] FAIL - delete-me user still exists ($COUNT rows)" >&2
  echo "[check-27] this means the in-app Delete Account flow did not reach the server, the destructive button was not tapped, or the user.deleteMe mutation failed silently." >&2
  exit 1
fi

echo "[check-27] PASS - hard delete confirmed (no User row for $DELETE_ME_EMAIL)"
