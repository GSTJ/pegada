#!/usr/bin/env bash
# Pre-test setup for flow 45: give Nina four photos instead of one.
#
# Every dog `maestro-seed.ts` creates has exactly ONE image, so the photo
# carousel in `components/MainCard` — the two half-screen Pressables, the
# pagination dots, and the spring that fires when there is no photo that way —
# is not reachable from any flow in the suite. That is why the black-half
# rendering bug on the last photo went unnoticed: nothing could get to it.
#
# placedog.net is the same host the seed itself uses, and the ids are distinct
# so it is obvious from a screenshot which photo is on screen.
#
# Every row is `chatux-gallery-%`, which `scripts/seed-before-test.sh` deletes
# at the head of every run — the extra photos change the pagination dots on any
# screen that renders Nina, and no other flow was written expecting them.
set -euo pipefail

DATABASE_URL="${DATABASE_URL:-postgresql://tony:hawk@localhost:3356/pegada}"

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q <<'SQL'
WITH nina AS (SELECT id FROM "Dog" WHERE name = 'Nina' LIMIT 1),
     extra(n, dog_id) AS (
       SELECT n, nina.id FROM nina, generate_series(1, 3) AS n
     )
INSERT INTO "Image" (id, url, "dogId", "createdAt", "updatedAt", position, status)
SELECT
  'chatux-gallery-' || extra.n,
  'https://placedog.net/640/480?id=' || (30 + extra.n),
  extra.dog_id,
  now(),
  now(),
  extra.n,
  'APPROVED'
FROM extra
ON CONFLICT (id) DO NOTHING;
SQL

psql "$DATABASE_URL" -tAc \
  "SELECT 'Nina has ' || count(i.id) || ' photos, dogId ' || max(d.id)
     FROM \"Dog\" d JOIN \"Image\" i ON i.\"dogId\" = d.id
    WHERE d.name = 'Nina'" \
  | sed 's/^/[pre-45] /'
