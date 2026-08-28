#!/usr/bin/env bash
# Post-check for flow 31 (edit-profile-save-seeded-images.yaml).
#
# The flow renames test@pegada.app's Rex to "Rex-<timestamp>" and leaves his
# seeded photos untouched. This asserts the mutation actually reached Postgres
# — the 400 the flow guards against left the DB on the seeded literal "Rex"
# while the screen looked, for a moment, like it might have saved.
#
# It also asserts the dog still HAS its photos: a "fix" that made the save
# succeed by dropping the images the server rejected would pass the flow and
# be much worse than the bug.
set -euo pipefail

DATABASE_URL="${DATABASE_URL:-postgresql://tony:hawk@localhost:3356/pegada}"
TEST_EMAIL="${TEST_EMAIL:-test@pegada.app}"

read -r DOG_ID DOG_NAME <<<"$(psql "$DATABASE_URL" -At -F' ' -c \
  "SELECT d.id, d.name FROM \"Dog\" d
     JOIN \"User\" u ON u.id = d.\"userId\"
     WHERE u.email = '$TEST_EMAIL' AND d.\"deletedAt\" IS NULL
     ORDER BY d.\"createdAt\" ASC LIMIT 1")"

if [[ -z "${DOG_ID:-}" ]]; then
  echo "[check-31] FAIL - no Dog row for $TEST_EMAIL (seed broken?)" >&2
  exit 1
fi

echo "[check-31] dog=$DOG_ID name='$DOG_NAME'"

if [[ "$DOG_NAME" != Rex-* ]]; then
  echo "[check-31] FAIL - expected Dog.name LIKE 'Rex-%', got '$DOG_NAME'." >&2
  echo "[check-31] the myDog.update mutation did not persist. If the app toasted" >&2
  echo "[check-31] 'Unable to save profile information', the API rejected the" >&2
  echo "[check-31] echoed-back image URLs — see packages/api/src/shared/dog-input-schema.ts." >&2
  exit 1
fi

IMAGE_COUNT=$(psql "$DATABASE_URL" -tAc \
  "SELECT COUNT(*) FROM \"Image\" WHERE \"dogId\" = '$DOG_ID'")

if [[ "$IMAGE_COUNT" -lt 1 ]]; then
  echo "[check-31] FAIL - the save dropped every image (count=$IMAGE_COUNT)." >&2
  echo "[check-31] the mutation must keep photos it could not re-validate, not delete them." >&2
  exit 1
fi

echo "[check-31] PASS - name='$DOG_NAME', images kept ($IMAGE_COUNT)"
