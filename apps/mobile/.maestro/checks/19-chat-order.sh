#!/usr/bin/env bash
# Post-check for flow 19 (chat-message-order.yaml).
#
# The flow sends "REGRESSION_BOTTOM_CHECK" into the seeded Rex<->Bella
# conversation. XCUITest can't see RN text on this build, so the flow
# itself can only screenshot — this check proves the send actually hit
# the API and persisted a Message row.
#
# Ordering context: the API returns messages newest-first; the UI
# reverses in useChatPagination. We assert the new message is the
# NEWEST row in the match (max createdAt), which is the server-side
# half of the "renders at the bottom" invariant.
#
# The maestro seed is idempotent and resets the conversation, so stale
# rows from earlier runs don't accumulate.
#
# DATABASE_URL defaults to local dev Postgres on port 3356; override via
# the environment for CI.
set -euo pipefail

DATABASE_URL="${DATABASE_URL:-postgresql://tony:hawk@localhost:3356/pegada}"
MARKER="REGRESSION_BOTTOM_CHECK"

NEWEST=$(psql "$DATABASE_URL" -tAc \
  "SELECT m.content FROM \"Message\" m
     WHERE m.\"deletedAt\" IS NULL
     ORDER BY m.\"createdAt\" DESC LIMIT 1")

if [[ "$NEWEST" != *"$MARKER"* ]]; then
  echo "[check-19] FAIL - newest Message row is '$NEWEST', expected it to contain '$MARKER'" >&2
  echo "[check-19] the send tap did not reach the API (composer/send coords drifted, or the mutation failed)." >&2
  exit 1
fi

echo "[check-19] PASS - '$MARKER' persisted as the newest message"
