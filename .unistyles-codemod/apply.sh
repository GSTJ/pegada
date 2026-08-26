#!/usr/bin/env bash
# Rerunnable, deterministic migration of apps/mobile onto react-native-unistyles.
#
# Always starts from a clean apps/mobile, so the output is a function of the
# codemod alone. Every fix belongs in src/ or in patches/, never in the
# generated diff.
#
#   .unistyles-codemod/apply.sh            # revert, setup, transform, patch, format, gate
#   .unistyles-codemod/apply.sh --analyze  # classify only, write nothing
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
root="$(dirname "$here")"
cd "$root"

if [[ "${1:-}" == "--analyze" ]]; then
  exec npx --prefix "$here" tsx "$here/src/cli.ts" analyze
fi

# The last commit before the migration. Everything downstream is relative to
# it: the revert restores apps/mobile from it and both parity ledgers read the
# pristine sources from it. It used to be HEAD, which only worked while the
# migration was uncommitted — now that it is committed, reverting to HEAD would
# hand the transform its own output and the run would be a silent no-op.
#
# It is d22dbde rather than the f85575d the codemod was authored on. The two
# hold the same apps/mobile apart from d22dbde's Maestro add-photo affordance,
# and that affordance has to survive the migration: reverting to f85575d would
# quietly throw it away every run.
base="${UNISTYLES_BASE_REF:-d22dbde4f2ab5c1cf1afa4abb045a0c1d3823239}"
if ! git rev-parse --verify --quiet "$base^{commit}" >/dev/null; then
  echo "FAILED: base ref $base does not resolve" >&2
  exit 1
fi

# Three moves, because "revert a subtree to a ref" is not one git command:
# restore what the ref has, delete what only HEAD has (the files the migration
# added), and put the index back on HEAD so a successful run ends with a clean
# `git status` instead of the whole subtree staged. The clean comes first —
# after the reset, the pristine-only files (`divider.ts` and friends) look
# untracked, and cleaning then would delete the very sources we just restored.
echo "==> reverting apps/mobile to $base"
git clean -fdq apps/mobile
git checkout -q HEAD -- apps/mobile
git checkout -q "$base" -- apps/mobile
git diff --name-only --diff-filter=A -z "$base" HEAD -- apps/mobile |
  while IFS= read -r -d '' file; do rm -f "$file"; done
git reset -q -- apps/mobile

# The migration owns styling and its four runtime dependencies. Release and
# native integration can move while this long-lived branch is open, so keep
# the branch's package manifest and app config instead of rewinding those two
# files to the pristine styling baseline. setup.mjs still normalizes the four
# migration dependencies below.
git checkout -q HEAD -- apps/mobile/package.json apps/mobile/app.config.ts
git reset -q -- apps/mobile/package.json apps/mobile/app.config.ts

echo "==> setup (deps, babel, StyleSheet.configure, theme bridge)"
node "$here/bin/setup.mjs"

echo "==> transform"
npx --prefix "$here" tsx "$here/src/cli.ts" transform

echo "==> overlay (hand-converted modules)"
node "$here/bin/overlay.mjs"

# Formatting runs twice, and the first pass is load-bearing rather than tidy:
# the patches below are diffs against the *formatted* transform output, because
# that is the tree each batch actually opened and edited. The transform appends
# its `useUnistyles` import at the end of the import block and oxfmt sorts it up
# into the third-party group, so an unformatted tree gives the patches the wrong
# context and they fail to apply.
echo "==> format (transform output)"
npx oxfmt apps/mobile/src apps/mobile/index.js apps/mobile/babel.config.js >/dev/null

# The modules the transform refused to touch — inheritance roots, prop spreads,
# animated styles — were converted by hand, one batch per agent, and exported as
# patches. Filename order is the order they were written in, and it matters:
# later batches edit files earlier ones created (`33-feedback-card` touches the
# `MainCard/styles.tsx` that `12-main-card` renames into existence).
#
# Only the apps/mobile half is replayed. Each patch is the raw `git diff` its
# batch exported, so it also carries that batch's edits to the codemod itself —
# ledger entries under manual/, evaluator and ledger fixes under src/. Those are
# already committed here and are not reverted, so re-applying them would fail.
echo "==> patches (hand-converted modules)"
shopt -s nullglob
patches=("$here"/patches/*.patch)
shopt -u nullglob

if [[ ${#patches[@]} -eq 0 ]]; then
  echo "[patches] no patches to apply"
fi

for patch in "${patches[@]}"; do
  if ! git apply --include="apps/mobile/*" --whitespace=nowarn "$patch"; then
    echo "[patches] FAILED to apply ${patch##*/}" >&2
    echo "           The tree the patch expects is not the tree the transform produced." >&2
    echo "           Fix the patch (or the transform), never the committed snapshot." >&2
    exit 1
  fi
  echo "[patches] applied ${patch##*/}"
done

echo "==> format (patched tree)"
npx oxfmt apps/mobile/src apps/mobile/index.js apps/mobile/babel.config.js >/dev/null

# The gate. Replays styled-components' own pipeline over the pristine sources
# and deep-compares it against the emitted sheets, per theme and per prop
# combination. A mismatch here means the app would render differently, so it
# stops the run rather than leaving it for someone to notice on a screen.
echo "==> parity ledger"
npx --prefix "$here" tsx "$here/src/parity.ts" "$base"

# Same gate, pointed at the modules the transform skipped and the patches
# converted by hand. Those are the inheritance roots everything else extends,
# so they are the ones worth proving.
echo "==> parity ledger (manual)"
npx --prefix "$here" tsx "$here/src/parity-manual.ts"

echo "==> done"
