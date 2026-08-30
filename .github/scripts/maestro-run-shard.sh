#!/usr/bin/env bash
# Run one Maestro shard through the repo's own run-flow.sh and emit a JUnit
# file that maestro-report.py can read.
#
#   maestro-run-shard.sh <shard-name> <flow-id> [flow-id ...]
#
# WHY THIS EXISTS RATHER THAN `maestro test <files...> --format junit`
#
# The iOS extended lane calls maestro directly, which means it skips
# apps/mobile/.maestro/scripts/run-flow.sh — and with it the per-flow seed,
# the `scripts/pre/<NN>-*.sh` setup and the `checks/<NN>-*.sh` post-check.
# That is forced on it: a hosted macOS runner has no route to the database
# those three things talk to. This lane has the database on localhost, so it
# runs the real wrapper, and the wrapper's exit code — not maestro's — is the
# verdict. Several flows here are ONLY meaningful through it:
#
#   * 34 asserts a date format that scripts/pre/34-backdate-chat.sh creates.
#   * 33 and 35 park a screen; checks/33 and checks/35 measure the frame
#     buffer, which is where the actual assertion lives.
#   * 50's post-check is what proves the match, the messages and both push
#     events reached Postgres at all.
#
# maestro's own JUnit cannot express a post-check failure, so this script
# synthesizes the rollup instead: one <testsuite> per flow, named by file
# stem (which is what maestro-report.py's quarantine lookup compares
# against), failed iff run-flow.sh exited non-zero for every attempt.
#
# Exit code is 0 when every flow passed, 1 otherwise. Callers that want a
# soft gate discard it; the job-level `continue-on-error` does that today.
set -uo pipefail

SHARD="${1:?usage: maestro-run-shard.sh <shard-name> <flow-id> [flow-id ...]}"
shift
FLOW_IDS=("$@")
if [ "${#FLOW_IDS[@]}" -eq 0 ]; then
  echo "::error::no flow ids given for shard $SHARD"
  exit 2
fi

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
MAESTRO_DIR="$REPO_ROOT/apps/mobile/.maestro"
RUN_FLOW="$MAESTRO_DIR/scripts/run-flow.sh"
QUARANTINE_FILE="$MAESTRO_DIR/quarantined.txt"
LOG_DIR="${MAESTRO_SHARD_LOG_DIR:-$REPO_ROOT/maestro-logs-$SHARD}"
JUNIT="${MAESTRO_SHARD_JUNIT:-$REPO_ROOT/maestro-results-$SHARD.xml}"

# Retries absorb single-run noise the same way the required lane does. They
# are safe here precisely because run-flow.sh re-seeds and re-runs the
# pre-script on every invocation, so attempt 2 starts from the same state
# attempt 1 did rather than from attempt 1's wreckage.
ATTEMPTS="${MAESTRO_SHARD_ATTEMPTS:-2}"

mkdir -p "$LOG_DIR"

# XML-escape, because a failing flow's log tail goes into an attribute.
esc() {
  printf '%s' "$1" \
    | sed -e 's/&/\&amp;/g' -e 's/</\&lt;/g' -e 's/>/\&gt;/g' \
          -e 's/"/\&quot;/g' -e "s/'/\&apos;/g" \
    | tr -d '\000-\010\013\014\016-\037'
}

# Same quarantine semantics the iOS extended lane applies: a quarantined
# flow is not run at all. Skipping rather than running-and-forgiving matters
# on this lane, where a flow costs minutes of emulator time.
QUARANTINED=""
if [ -f "$QUARANTINE_FILE" ]; then
  QUARANTINED="$(grep -v '^[[:space:]]*#' "$QUARANTINE_FILE" | awk '{print $1}' | grep -v '^$' | sort -u)"
fi

SUITES=""
OVERALL_RC=0
SUMMARY=()

for id in "${FLOW_IDS[@]}"; do
  # Same padding rule run-flow.sh uses, so `7` and `07` name one flow.
  prefix="$id"
  if [[ "$prefix" =~ ^[0-9]$ ]]; then
    prefix="0$prefix"
  fi
  matches=("$MAESTRO_DIR/$prefix"-*.yaml)
  if [ ! -e "${matches[0]}" ]; then
    # Reported as a failing suite, not just an ::error::. A shard that names
    # a flow which has been renamed away would otherwise go green with one
    # fewer row in the summary table, which is how coverage disappears
    # without anyone noticing.
    echo "::error::no flow matches prefix $prefix in $MAESTRO_DIR"
    OVERALL_RC=1
    SUMMARY+=("$id:missing")
    SUITES+="  <testsuite name=\"$(esc "$prefix-MISSING")\" tests=\"1\" failures=\"1\" time=\"0\">
    <testcase name=\"$(esc "$prefix-MISSING")\" classname=\"$(esc "$prefix-MISSING")\" time=\"0\">
      <failure message=\"$(esc "no flow file matches prefix $prefix under apps/mobile/.maestro/ — the shard list and the flow files have drifted apart")\"/>
    </testcase>
  </testsuite>
"
    continue
  fi
  stem="$(basename "${matches[0]}" .yaml)"
  log="$LOG_DIR/flow-$prefix.log"

  if printf '%s\n' "$QUARANTINED" | grep -qx "$stem"; then
    echo "::notice::skipping quarantined flow: $stem"
    SUMMARY+=("$prefix:quarantined")
    continue
  fi

  rc=1
  started=$SECONDS
  for attempt in $(seq 1 "$ATTEMPTS"); do
    echo "::group::$stem (attempt $attempt/$ATTEMPTS)"
    bash "$RUN_FLOW" "$prefix" 2>&1 | tee "$log"
    rc="${PIPESTATUS[0]}"
    echo "::endgroup::"
    if [ "$rc" -eq 0 ]; then
      break
    fi
    echo "::warning::$stem attempt $attempt failed (rc=$rc)"
  done
  elapsed=$((SECONDS - started))

  if [ "$rc" -eq 0 ]; then
    echo "[$SHARD] $stem PASS (${elapsed}s)"
    SUMMARY+=("$prefix:0")
    SUITES+="  <testsuite name=\"$(esc "$stem")\" tests=\"1\" failures=\"0\" time=\"$elapsed\">
    <testcase name=\"$(esc "$stem")\" classname=\"$(esc "$stem")\" time=\"$elapsed\"/>
  </testsuite>
"
  else
    echo "[$SHARD] $stem FAIL rc=$rc (${elapsed}s)"
    OVERALL_RC=1
    SUMMARY+=("$prefix:$rc")
    # The tail is what a reader needs: run-flow.sh prints the failing
    # maestro command or the post-check's own "FAIL — ..." line last.
    tail_msg="$(tail -n 12 "$log" 2>/dev/null | tr '\n' ' ')"
    SUITES+="  <testsuite name=\"$(esc "$stem")\" tests=\"1\" failures=\"1\" time=\"$elapsed\">
    <testcase name=\"$(esc "$stem")\" classname=\"$(esc "$stem")\" time=\"$elapsed\">
      <failure message=\"$(esc "run-flow.sh exited $rc after $ATTEMPTS attempt(s): ${tail_msg:0:400}")\"/>
    </testcase>
  </testsuite>
"
  fi
done

{
  echo '<?xml version="1.0" encoding="UTF-8"?>'
  echo '<testsuites>'
  printf '%s' "$SUITES"
  echo '</testsuites>'
} > "$JUNIT"

printf '%s\n' "${SUMMARY[@]}" > "$LOG_DIR/summary.txt"
echo "[$SHARD] summary: ${SUMMARY[*]}"
echo "[$SHARD] junit: $JUNIT"

exit "$OVERALL_RC"
