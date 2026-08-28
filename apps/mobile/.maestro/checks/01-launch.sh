#!/usr/bin/env bash
# Post-check for flow 01. The probe lives in the .mjs next to this file;
# run-flow.sh only knows how to launch `checks/<NN>-*.sh`.
set -euo pipefail
exec node "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/01-launch.mjs"
