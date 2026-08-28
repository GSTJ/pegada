#!/usr/bin/env bash
# Flow 22's pre-hook. The work is shared with the other flow that consumes
# MatchMe — see ../reset-matchme.sh for what it does and why it is not in the
# shared seed.
set -euo pipefail
exec "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/reset-matchme.sh"
