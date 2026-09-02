#!/usr/bin/env bash
# Flow 47's pre-hook. The work is shared with flow 46 — see
# 46-resolve-dog-id.sh for what it does and why.
set -euo pipefail
exec "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/46-resolve-dog-id.sh"
