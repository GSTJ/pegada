#!/usr/bin/env bash
# Post-check for flow 20 (account-creation-journey.yaml).
#
# Verifies that the fresh-magic signup actually persisted to the database:
#   - ≥1 fresh User row matching the maestro-fresh email regex.
#   - The fresh User has ≥1 Dog row.
#   - That Dog has ≥1 Image row (status PENDING is fine — image moderation
#     is async, the upload itself is what we're proving).
#
# Returns exit 0 on PASS, non-zero on any miss with a human-readable
# diagnosis printed to stderr.
#
# Run AFTER the maestro flow finishes (the flow's runFlow→login-fresh
# already inserted the User row via the API's regex-magic upsert).
#
# DATABASE_URL defaults to the local dev Postgres on port 3356; override
# via the environment for CI.
set -euo pipefail

DATABASE_URL="${DATABASE_URL:-postgresql://tony:hawk@localhost:3356/pegada}"
EMAIL_PATTERN="${EMAIL_PATTERN:-maestro-fresh%@pegada.app}"

# psql returns one bare line per row when -t -A is set, so we can pipe
# straight into bash arithmetic.
USER_COUNT=$(psql "$DATABASE_URL" -tAc \
  "SELECT COUNT(*) FROM \"User\" WHERE email LIKE '$EMAIL_PATTERN' AND \"deletedAt\" IS NULL")
DOG_COUNT=$(psql "$DATABASE_URL" -tAc \
  "SELECT COUNT(*) FROM \"Dog\" d
     JOIN \"User\" u ON u.id = d.\"userId\"
     WHERE u.email LIKE '$EMAIL_PATTERN' AND d.\"deletedAt\" IS NULL")
IMAGE_COUNT=$(psql "$DATABASE_URL" -tAc \
  "SELECT COUNT(*) FROM \"Image\" i
     JOIN \"Dog\" d  ON d.id = i.\"dogId\"
     JOIN \"User\" u ON u.id = d.\"userId\"
     WHERE u.email LIKE '$EMAIL_PATTERN' AND d.\"deletedAt\" IS NULL")

echo "[check-20] fresh users=$USER_COUNT, dogs=$DOG_COUNT, images=$IMAGE_COUNT"

fail=0
if [[ "$USER_COUNT" -lt 1 ]]; then
  echo "[check-20] FAIL — expected ≥1 fresh user, got $USER_COUNT" >&2
  fail=1
fi
if [[ "$DOG_COUNT" -lt 1 ]]; then
  echo "[check-20] FAIL — expected ≥1 dog for fresh user, got $DOG_COUNT" >&2
  fail=1
fi
if [[ "$IMAGE_COUNT" -lt 1 ]]; then
  echo "[check-20] FAIL — expected ≥1 image for fresh dog, got $IMAGE_COUNT" >&2
  fail=1
fi

if [[ "$fail" -ne 0 ]]; then
  echo "[check-20] FAIL" >&2
  exit 1
fi
echo "[check-20] PASS"
