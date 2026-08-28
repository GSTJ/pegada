#!/usr/bin/env bash
# Post-check for flow 50 (50-grand-journey.yaml).
#
# The journey's screen-level assertions prove the UI did what it looked like it
# did. This proves the server agreed, and it is the only place several of the
# journey's claims can be settled at all:
#
#   * a dog's GENDER is never rendered as text anywhere the flow can read it;
#   * COORDINATES are the thing the whole deck is built from and the thing
#     20-account-creation-journey.yaml's post-check never looked at;
#   * a message BUBBLE is painted optimistically, before the mutation answers;
#   * and PUSH NOTIFICATIONS have no UI on a simulator whatsoever.
#
# THE PUSH ASSERTION, since it is the least obvious thing here.
#
# `get-push-notification-token.ts` returns early when `!Device.isDevice`, and
# a simulator or emulator is never `isDevice`. So no user created through the
# app has ever had a push token, every `if (pushToken)` guard in
# swipe-service / match-service / message-service short-circuits, and the
# notification path is not merely unasserted — it is never ENTERED. Real APNs
# delivery is out of reach here and always will be.
#
# What is in reach: `PushNotificationService.enqueuePushNotification` validates
# with `Expo.isExpoPushToken` BEFORE any network call, and on failure calls
# `UserService.blacklistPushToken`, which is
# `updateMany({ where: { pushToken }, data: { pushToken: "" } })` — an
# observable write. scripts/pre/50-reset-journey-accounts.sh seeds each account
# with a token that is deliberately not a well-formed Expo token, so entering
# the path blanks that column and nothing leaves the machine.
#
# Two events, two recipients, two columns:
#   A's token, blanked by SwipeService.sendLikeNotification when B liked Ares
#     (segment 06);
#   B's token, blanked by MatchService.createMatch when A liked back
#     (segment 07), which notifies `match.responder.user`.
#
# The tokens differ per account on purpose: `blacklistPushToken` matches on the
# token VALUE, so a single shared sentinel would be blanked by the first flip
# and would prove nothing about the second.
#
# Not asserted, and deliberately: the message notification in segment 08.
# `MessageService.sendMessage` addresses it to B, whose token this run has
# already blanked, so the `if (otherDog.user.pushToken)` guard sees "" and
# skips. Re-arming a sentinel mid-run would need a step between two Maestro
# commands, which the harness has no hook for. Two proven flips is what this
# design buys; a third would be a test that passes for the wrong reason.
#
# DATABASE_URL defaults to the local dev Postgres on port 3356; override via
# the environment for CI.
set -euo pipefail

DATABASE_URL="${DATABASE_URL:-postgresql://tony:hawk@localhost:3356/pegada}"
A_EMAIL="${A_EMAIL:-journey-a@pegada.app}"
B_EMAIL="${B_EMAIL:-journey-b@pegada.app}"

fail() {
  echo "[check-50] FAIL — $1" >&2
  exit 1
}

q() { psql "$DATABASE_URL" -tAc "$1"; }

# --- The two accounts and their dogs ---------------------------------------
# Identified by OWNERSHIP, not by name: the name is one of the things under
# test, so resolving the dog by it would hide a rename or a truncation.
read_dog() {
  q "SELECT d.id || '|' || d.name || '|' || d.gender || '|' ||
            coalesce(d.color::text, '<null>') || '|' ||
            coalesce(d.\"preferredColor\"::text, '<null>')
       FROM \"Dog\" d JOIN \"User\" u ON u.id = d.\"userId\"
      WHERE u.email = '$1' AND d.\"deletedAt\" IS NULL
      ORDER BY d.\"createdAt\" ASC LIMIT 1"
}

A_ROW=$(read_dog "$A_EMAIL")
B_ROW=$(read_dog "$B_EMAIL")

[[ -n "$A_ROW" ]] || fail "no dog for $A_EMAIL — segment 01 never created one"
[[ -n "$B_ROW" ]] || fail "no dog for $B_EMAIL — segment 05 never created one"

IFS='|' read -r A_DOG A_NAME A_GENDER A_COLOR A_PREF <<<"$A_ROW"
IFS='|' read -r B_DOG B_NAME B_GENDER B_COLOR B_PREF <<<"$B_ROW"

echo "[check-50] A: $A_NAME ($A_GENDER, coat $A_COLOR, prefers $A_PREF) $A_DOG"
echo "[check-50] B: $B_NAME ($B_GENDER, coat $B_COLOR, prefers $B_PREF) $B_DOG"

# Names, exactly. "Ares" and not "Aresd": the first run of segment 01 typed the
# name while the gender radio was under the keyboard, and the tap meant for the
# radio landed on the keyboard's `d` key instead. It passed anyway, because
# MALE is the form default and A wanted MALE — so nothing failed, and the dog
# was quietly called Aresd. An exact-match assertion is what makes that
# class of miss loud.
[[ "$A_NAME" == "Ares" ]]   || fail "A's dog is named '$A_NAME', expected exactly 'Ares' (stray keystroke while typing?)"
[[ "$B_NAME" == "Bianca" ]] || fail "B's dog is named '$B_NAME', expected exactly 'Bianca'"

# Gender is the journey's load-bearing invariant and has no on-screen text.
[[ "$A_GENDER" == "MALE" ]]   || fail "A's dog is $A_GENDER, expected MALE"
[[ "$B_GENDER" == "FEMALE" ]] || fail "B's dog is $B_GENDER, expected FEMALE — the radio tap did not register, and the deck's opposite-gender filter means the two accounts could never have seen each other"

# The colour preference each account set through the bottom-sheet picker, and
# the absent coat colour that makes it selective.
[[ "$A_PREF" == "BLACK" ]] || fail "A's preferredColor is $A_PREF, expected BLACK — the preferences save did not reach the server"
[[ "$B_PREF" == "BLACK" ]] || fail "B's preferredColor is $B_PREF, expected BLACK"
[[ "$A_COLOR" == "<null>" ]] || fail "A's dog has coat colour $A_COLOR; the journey's deck isolation depends on it being unset"
[[ "$B_COLOR" == "<null>" ]] || fail "B's dog has coat colour $B_COLOR; the journey's deck isolation depends on it being unset"

# --- Coordinates ------------------------------------------------------------
# The assertion 20-account-creation-journey.yaml's post-check never made. A
# granted location that never reached the database leaves the user in the last
# distance bucket of every deck in the world, with `distance: null` on every
# card, and nothing on screen says so.
for pair in "$A_EMAIL:A" "$B_EMAIL:B"; do
  email="${pair%%:*}"; who="${pair##*:}"
  LOC=$(q "SELECT coalesce(latitude::text,'<null>') || '|' || coalesce(longitude::text,'<null>')
             FROM \"User\" WHERE email = '$email'")
  [[ "$LOC" != *"<null>"* ]] || fail "$who ($email) has NULL coordinates: $LOC — AskForLocation navigated on without persisting the grant"
  echo "[check-50] $who coordinates: $LOC"
done

# --- Both halves of the match ----------------------------------------------
# Both directions asserted separately, because a match created from only one of
# them is exactly the bug a seeded fixture cannot catch.
B_LIKED_A=$(q "SELECT count(*) FROM \"Interest\"
                WHERE \"requesterId\" = '$B_DOG' AND \"responderId\" = '$A_DOG'
                  AND \"swipeType\" = 'INTERESTED' AND \"deletedAt\" IS NULL")
A_LIKED_B=$(q "SELECT count(*) FROM \"Interest\"
                WHERE \"requesterId\" = '$A_DOG' AND \"responderId\" = '$B_DOG'
                  AND \"swipeType\" = 'INTERESTED' AND \"deletedAt\" IS NULL")

[[ "$B_LIKED_A" -ge 1 ]] || fail "no INTERESTED row from B to A — segment 06's like never landed"
[[ "$A_LIKED_B" -ge 1 ]] || fail "no INTERESTED row from A to B — segment 07's like never landed"
echo "[check-50] mutual interest: B→A=$B_LIKED_A, A→B=$A_LIKED_B"

MATCH_ID=$(q "SELECT id FROM \"Match\"
               WHERE \"deletedAt\" IS NULL
                 AND ((\"requesterId\" = '$A_DOG' AND \"responderId\" = '$B_DOG')
                   OR (\"requesterId\" = '$B_DOG' AND \"responderId\" = '$A_DOG'))
               ORDER BY \"createdAt\" DESC LIMIT 1")
[[ -n "$MATCH_ID" ]] || fail "no Match row between Ares and Bianca — the mutual like did not produce a match"
echo "[check-50] match: $MATCH_ID"

# Exactly one. `createMatch` guards against duplicates with a findFirst; a
# second row would mean the guard missed and both swipes created their own.
MATCH_COUNT=$(q "SELECT count(*) FROM \"Match\"
                  WHERE \"deletedAt\" IS NULL
                    AND ((\"requesterId\" = '$A_DOG' AND \"responderId\" = '$B_DOG')
                      OR (\"requesterId\" = '$B_DOG' AND \"responderId\" = '$A_DOG'))")
[[ "$MATCH_COUNT" -eq 1 ]] || fail "expected exactly 1 Match row, found $MATCH_COUNT"

# --- The conversation, in both directions -----------------------------------
A_MSG=$(q "SELECT count(*) FROM \"Message\"
            WHERE \"matchId\" = '$MATCH_ID' AND \"senderId\" = '$A_DOG'
              AND \"receiverId\" = '$B_DOG' AND \"deletedAt\" IS NULL
              AND content LIKE '%Park at six%'")
B_MSG=$(q "SELECT count(*) FROM \"Message\"
            WHERE \"matchId\" = '$MATCH_ID' AND \"senderId\" = '$B_DOG'
              AND \"receiverId\" = '$A_DOG' AND \"deletedAt\" IS NULL
              AND content LIKE '%Six works%'")

[[ "$A_MSG" -ge 1 ]] || fail "A's message is not in the database — the bubble in segment 08 was the optimistic one and the mutation never landed"
[[ "$B_MSG" -ge 1 ]] || fail "B's reply is not in the database"
echo "[check-50] messages: A→B=$A_MSG, B→A=$B_MSG"

# --- Push notification path -------------------------------------------------
# See the header. The sentinel flipping to '' is the record that the server
# entered the notification path for that exact recipient, for that exact event.
check_token_flipped() {
  local email="$1" who="$2" event="$3" sentinel="$4"
  local token
  token=$(q "SELECT coalesce(\"pushToken\", '<null>') FROM \"User\" WHERE email = '$email'")

  if [[ "$token" == "$sentinel" ]]; then
    fail "$who still holds its push sentinel ($sentinel) — $event never entered the notification path. Either the guard short-circuited (empty token at the time), or the requester failed the approved-image check in SwipeService."
  fi

  [[ "$token" == "" ]] || fail "$who's pushToken is '$token'; expected '' (blanked by UserService.blacklistPushToken) — something rewrote the column"

  echo "[check-50] push: $who's sentinel was blanked by $event"
}

check_token_flipped "$A_EMAIL" "A" "SwipeService.sendLikeNotification (B liked Ares)" "GRANDJOURNEY-INVALID-PUSH-A"
check_token_flipped "$B_EMAIL" "B" "MatchService.createMatch (A liked back)"          "GRANDJOURNEY-INVALID-PUSH-B"

echo "[check-50] PASS — two accounts, one live mutual match, a conversation in both directions, and both push events observed"
