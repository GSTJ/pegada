#!/usr/bin/env bash
# Removes every row `lib-seed-long-chat.sh` inserted.
#
# Not a `pre/<NN>-` script: run-flow.sh must never pick it up. Run it by hand
# after flows 43/44 so the rest of the suite sees the conversation the normal
# maestro seed created — an empty Rex<->Nina match.
set -euo pipefail

DATABASE_URL="${DATABASE_URL:-postgresql://tony:hawk@localhost:3356/pegada}"

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q \
  -c "DELETE FROM \"Message\" WHERE content LIKE 'chatux message %';"

psql "$DATABASE_URL" -tAc \
  "SELECT count(*) FROM \"Message\" WHERE content LIKE 'chatux message %'" \
  | sed 's/^/[cleanup-chatux] remaining fixture rows: /'
