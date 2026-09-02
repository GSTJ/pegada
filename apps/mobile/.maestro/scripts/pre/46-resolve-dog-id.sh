#!/usr/bin/env bash
# Pre-test setup shared by flow 46 (deep-link sign-in hand-off) and flow 47
# (deep link while already logged in). Both open `pegada://dog/<id>` and
# need an id that resolves through `dog.get` for ANY logged-in user.
#
# Bella (test+bella@pegada.app) is exactly that: seeded on every
# maestro-seed.ts run and matched with Rex, so test@pegada.app can always
# read her profile. Her id IS a constant now (SEED_DOG_IDS.bella), but
# resolving it through the API is what makes this hook worth keeping —
# see below.
#
# Maestro's `runScript:` step cannot make this call itself (sandboxed
# GraalJS, no network access — see the README's "Why a wrapper script"
# section for the same limitation applied to DB access), so this resolves
# the id out of band, the same way seed-before-test.sh and the other
# pre/*.sh hooks do, and drops it in a file run-flow.sh reads and forwards
# to `maestro test -e DOG_ID=...`.
#
# Goes through the API rather than psql: psql isn't guaranteed to be on a
# dev machine and no other script here depends on it. Logging in as the
# magic user and reading match.getAll is the same path the app itself uses
# to learn about Bella, so this doubles as a liveness check of the API +
# magic-login bypass before the flow even starts.
set -euo pipefail

API_URL="${EXPO_PUBLIC_API_URL:-http://localhost:3010/api}"
# APPLE_MAGIC_EMAIL is a comma separated list and is often unset on a dev
# machine. Default it before trimming: under `set -u` a suffix expansion on
# an unset name is an error, so `${APPLE_MAGIC_EMAIL%%,*}` would abort the
# hook instead of falling through to test@pegada.app.
MAGIC_EMAIL="${APPLE_MAGIC_EMAIL:-test@pegada.app}"
MAGIC_EMAIL="${MAGIC_EMAIL%%,*}"
MAGIC_CODE="${APPLE_MAGIC_CODE:-424242}"
CACHE_FILE="${TMPDIR:-/tmp}/pegada-maestro-dog-id"

TOKEN=$(curl -sf -X POST "$API_URL/trpc/authentication.login?batch=1" \
  -H "Content-Type: application/json" \
  -d "{\"0\":{\"json\":{\"email\":\"$MAGIC_EMAIL\",\"code\":\"$MAGIC_CODE\"}}}" \
  | jq -r '.[0].result.data.json.token // empty')

if [[ -z "$TOKEN" ]]; then
  echo "[pre-46] FATAL: could not log in as $MAGIC_EMAIL at $API_URL to resolve Bella's dog id" >&2
  exit 1
fi

MATCH_INPUT='%7B%220%22%3A%7B%22json%22%3Anull%2C%22meta%22%3A%7B%22values%22%3A%5B%22undefined%22%5D%7D%7D%7D'
DOG_ID=$(curl -sf "$API_URL/trpc/match.getAll?batch=1&input=$MATCH_INPUT" \
  -H "Authorization: Bearer $TOKEN" \
  | jq -r '[.[0].result.data.json[] | select(.dog.name == "Bella")][0].dog.id // empty')

if [[ -z "$DOG_ID" ]]; then
  echo "[pre-46] FATAL: could not resolve Bella's dog id — run maestro:seed first" >&2
  exit 1
fi

echo "$DOG_ID" > "$CACHE_FILE"
echo "[pre-46] resolved dog id: $DOG_ID (cached at $CACHE_FILE)"
