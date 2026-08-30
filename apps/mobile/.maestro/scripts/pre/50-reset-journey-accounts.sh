#!/usr/bin/env bash
# Pre-test setup for flow 50 (grand-journey.yaml).
#
# Two jobs.
#
# 1. CLEAN SLATE. journey-a@pegada.app and journey-b@pegada.app are sticky
#    magic emails: they are listed in APPLE_MAGIC_EMAIL, so login accepts
#    424242 and does NOT purge them on the way in. That is deliberate — the
#    journey logs each account in twice, and the purge-on-login behaviour of
#    the APPLE_MAGIC_EMAIL_REGEX path (`maestro-fresh*`) would delete account A
#    together with its dog and the match, halfway through the run. The cost of
#    a sticky account is that its teardown has to happen here instead, once.
#
# 2. PUSH-TOKEN SENTINELS. Both rows are recreated with a `pushToken` that is
#    deliberately NOT a well-formed Expo token, and the row is created WITHOUT
#    a dog, so the auth router still lands on CreateProfile. `user.upsert` in
#    AuthenticationService.login only writes `deletedAt: null` on an existing
#    row, so the sentinel survives the login.
#
#    That sentinel is how this suite observes push delivery at all. A simulator
#    is never `Device.isDevice`, so `get-push-notification-token.ts` returns
#    early and no user created through the app ever has a token — which means
#    every `if (pushToken)` guard in match-service / message-service /
#    swipe-service short-circuits and the notification path is never entered.
#    With a sentinel present the guard passes, `enqueuePushNotification`
#    validates the token with `Expo.isExpoPushToken`, fails, and calls
#    `UserService.blacklistPushToken`, which writes `pushToken = ''`.
#
#    So `pushToken` flipping from the sentinel to the empty string is a durable,
#    zero-network record that the server entered the notification path for that
#    exact recipient. checks/50-grand-journey.sh asserts both flips:
#      * A's, when B likes A's dog          (SwipeService.sendLikeNotification)
#      * B's, when A likes back and matches (MatchService.createMatch)
#    The tokens differ per account because `blacklistPushToken` matches on the
#    token VALUE (`updateMany where: { pushToken }`) — one shared sentinel would
#    blank both rows on the first flip and prove nothing about the second.
#
# Idempotent — safe to re-run between attempts.
#
# DATABASE_URL is overridable for CI / docker-compose.
set -euo pipefail

DATABASE_URL="${DATABASE_URL:-postgresql://tony:hawk@localhost:3356/pegada}"

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q <<'SQL'
WITH doomed AS (
  SELECT id FROM "User"
   WHERE email IN ('journey-a@pegada.app', 'journey-b@pegada.app')
),
doomed_dogs AS (
  SELECT id FROM "Dog" WHERE "userId" IN (SELECT id FROM doomed)
),
del_messages AS (
  DELETE FROM "Message"
   WHERE "senderId" IN (SELECT id FROM doomed_dogs)
      OR "receiverId" IN (SELECT id FROM doomed_dogs)
),
del_interests AS (
  DELETE FROM "Interest"
   WHERE "requesterId" IN (SELECT id FROM doomed_dogs)
      OR "responderId" IN (SELECT id FROM doomed_dogs)
),
del_matches AS (
  DELETE FROM "Match"
   WHERE "requesterId" IN (SELECT id FROM doomed_dogs)
      OR "responderId" IN (SELECT id FROM doomed_dogs)
),
del_images AS (
  DELETE FROM "Image" WHERE "dogId" IN (SELECT id FROM doomed_dogs)
),
del_dogs AS (
  DELETE FROM "Dog" WHERE id IN (SELECT id FROM doomed_dogs)
)
DELETE FROM "User" WHERE id IN (SELECT id FROM doomed);

INSERT INTO "User" (id, email, "pushToken", "createdAt", "updatedAt", plan)
VALUES
  (md5('journey-a@pegada.app'), 'journey-a@pegada.app',
   'GRANDJOURNEY-INVALID-PUSH-A', now(), now(), 'FREE'),
  (md5('journey-b@pegada.app'), 'journey-b@pegada.app',
   'GRANDJOURNEY-INVALID-PUSH-B', now(), now(), 'FREE');
SQL

STATE=$(psql "$DATABASE_URL" -tA -F'|' -c "
  SELECT u.email, coalesce(u.\"pushToken\", '<null>'), count(d.id)
    FROM \"User\" u
    LEFT JOIN \"Dog\" d ON d.\"userId\" = u.id
   WHERE u.email IN ('journey-a@pegada.app', 'journey-b@pegada.app')
   GROUP BY u.email, u.\"pushToken\"
   ORDER BY u.email
")

EXPECTED='journey-a@pegada.app|GRANDJOURNEY-INVALID-PUSH-A|0
journey-b@pegada.app|GRANDJOURNEY-INVALID-PUSH-B|0'

if [[ "$STATE" != "$EXPECTED" ]]; then
  echo "[pre-50] FAIL - journey accounts are not in the expected start state" >&2
  echo "[pre-50]   wanted:" >&2
  echo "$EXPECTED" | sed 's/^/[pre-50]     /' >&2
  echo "[pre-50]   got:" >&2
  echo "$STATE" | sed 's/^/[pre-50]     /' >&2
  exit 1
fi

echo "[pre-50] PASS - journey-a / journey-b reset to dogless rows with push sentinels"
