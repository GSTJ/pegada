#!/usr/bin/env bash
# Puts MatchMe back on Rex's swipe deck. Shared by the flow 21 and flow 22
# pre-hooks (pre/21-*.sh, pre/22-*.sh).
#
# Flow 22 has to CREATE the Rex<->MatchMe match itself — its post-check counts
# the row — so whatever a previous run left behind has to go: the Match, its
# Messages, and both Interests. Then MatchMe's one-sided pre-like goes back.
#
# Flow 21 needs it for the mirror reason: step 4 DISLIKES MatchMe to clear her
# without firing the new-match modal, and that Interest(Rex -> MatchMe,
# NOT_INTERESTED) hides her from the deck for good. Without a reset the second
# consecutive run of flow 21 finds a different dog on top.
#
# WHY it lives here and not in the shared seed: it used to run inside
# `maestro:seed`, which seed-before-test.sh calls before EVERY flow, against a
# SHARED dev Postgres. Mid-capture, a concurrent flow's seed hard-deleted the
# match a tour had just created. `message.send` started answering 500
# `Invalid matchId or senderId`, the chat rendered empty, MatchMe vanished
# from the Messages list, and edit-profile values reverted between chunks —
# which reads exactly like a chat regression and is not one. An hour went into
# attributing it (.unistyles-migration/tour-android/MANIFEST.md, "Environment
# trap that cost an hour").
#
# The teardown is real and flow 22 needs it. What it is not is something every
# other flow should do on its way past.
#
# DATABASE_URL is overridable for CI / docker-compose.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../../.." && pwd)"
DATABASE_URL="${DATABASE_URL:-postgresql://tony:hawk@localhost:3356/pegada}"

cd "$REPO_ROOT"
DATABASE_URL="$DATABASE_URL" pnpm -F @pegada/database maestro:reset-match

echo "[reset-matchme] PASS - MatchMe is back on Rex's deck with a fresh pre-like"
