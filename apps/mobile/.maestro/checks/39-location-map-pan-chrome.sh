#!/usr/bin/env bash
# Post-check for flow 39. The measurement lives in the .mjs next to this file;
# run-flow.sh only knows how to launch `checks/<NN>-*.sh`.
set -euo pipefail
exec node "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/39-location-map-pan-chrome.mjs"
