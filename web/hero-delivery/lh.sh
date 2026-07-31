#!/usr/bin/env bash
# Usage: lh.sh <label> <port>
set -euo pipefail
LABEL="$1"; PORT="$2"
OUT="/private/tmp/claude-501/-Users-jarvis-jarvis-lab/2a1052d2-0b02-4d95-a15f-65a1715c0c4b/scratchpad/lh"
mkdir -p "$OUT"
export CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
for i in 1 2 3; do
  npx --yes lighthouse@12 "http://localhost:${PORT}/" \
    --quiet \
    --form-factor=mobile \
    --screenEmulation.mobile \
    --only-categories=performance \
    --output=json \
    --output-path="${OUT}/${LABEL}-run${i}.json" \
    --chrome-flags="--headless=new --no-sandbox --disable-gpu --disable-dev-shm-usage" \
    >/dev/null 2>&1 || echo "run ${i} failed"
done
echo "done ${LABEL}"
