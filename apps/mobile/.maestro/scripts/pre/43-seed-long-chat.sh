#!/usr/bin/env bash
# Pre-test setup for flow 43. See lib-seed-long-chat.sh.
set -euo pipefail
exec bash "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib-seed-long-chat.sh"
