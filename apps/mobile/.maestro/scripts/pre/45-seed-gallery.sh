#!/usr/bin/env bash
# Pre-test guard for flow 45: Nina must be on exactly four photos.
#
# This used to INSERT three extra images, because `maestro-seed.ts` gave every
# dog exactly one and the photo carousel in `components/MainCard` — the two
# half-screen Pressables, the pagination dots, and the spring that fires when
# there is no photo that way — was not reachable from any flow in the suite.
# That is why the black-half rendering bug on the last photo went unnoticed:
# nothing could get to it.
#
# The seed owns Nina's gallery now (packages/database/maestro-seed.ts), so the
# insert would stack three more on top of the four and the check's "photo 4 of
# 4, paging forward" measurement would stop landing on the boundary. All this
# does is fail loudly if the fixture is not what checks/45-*.mjs assumes.
set -euo pipefail

DATABASE_URL="${DATABASE_URL:-postgresql://tony:hawk@localhost:3356/pegada}"

COUNT=$(psql "$DATABASE_URL" -tA -c "
  SELECT count(i.id)
    FROM \"Dog\" d
    JOIN \"Image\" i ON i.\"dogId\" = d.id AND i.status = 'APPROVED'
   WHERE d.id = 'seed-dog-nina' AND d.\"deletedAt\" IS NULL
")

if [[ "$COUNT" -ne 4 ]]; then
  echo "[pre-45] FAIL - Nina has $COUNT approved photos, expected 4. Run maestro:seed" >&2
  exit 1
fi

echo "[pre-45] PASS - Nina has 4 photos"
