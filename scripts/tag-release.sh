#!/usr/bin/env bash
# Tag a release from apps/mobile/app.config.ts's version.
#
# The tag is ANNOTATED and its message is the generated release notes, so
# `git show <tag>` tells you what shipped without a network round trip, and it
# matches the GitHub release body byte for byte (release-mobile.yml runs the
# same generator on the same range). CHANGELOG.md is regenerated at the end for
# you to commit through a PR, since the ruleset on main requires one.
#
#   ./scripts/tag-release.sh              # v<version from app.config.ts>
#   ./scripts/tag-release.sh v1.5.0-rc1   # explicit, e.g. a release candidate
#   DRY_RUN=1 ./scripts/tag-release.sh    # print the notes, tag nothing
#
# Pushing the tag is what starts release-mobile.yml: the native builds and the
# GitHub release. It never submits to a store on its own.
set -euo pipefail

cd "$(dirname "$0")/.."

REPO=${REPO:-GSTJ/pegada}
REMOTE=${REMOTE:-origin}

if [ $# -gt 0 ]; then
  TAG=$1
else
  # app.config.ts is TypeScript with a top-level `version: "x.y.z",`, so read
  # the literal instead of standing up a TS runtime just for one string.
  VERSION=$(sed -n 's/^[[:space:]]*version: "\([^"]*\)",$/\1/p' apps/mobile/app.config.ts | head -1)
  if [ -z "$VERSION" ]; then
    echo "error: could not read version from apps/mobile/app.config.ts" >&2
    exit 1
  fi
  TAG="v$VERSION"
fi

if git rev-parse -q --verify "refs/tags/$TAG" >/dev/null; then
  echo "error: tag $TAG already exists locally" >&2
  exit 1
fi

if git ls-remote --exit-code --tags "$REMOTE" "refs/tags/$TAG" >/dev/null 2>&1; then
  echo "error: tag $TAG already exists on $REMOTE" >&2
  exit 1
fi

PREVIOUS=$(git tag --list 'v*' --sort=-creatordate | head -1)
NOTES=$(python3 .github/scripts/changelog.py --notes HEAD --previous "$PREVIOUS" --repo "$REPO")

TITLE="$TAG"
if python3 .github/scripts/changelog.py --is-breaking HEAD --previous "$PREVIOUS" >/dev/null; then
  TITLE="$TAG (contains breaking changes)"
fi

MESSAGE=$(printf '%s\n\n%s\n' "$TITLE" "$NOTES")

if [ "${DRY_RUN:-0}" = "1" ]; then
  printf '%s\n' "$MESSAGE"
  echo
  echo "(dry run, nothing tagged)"
  exit 0
fi

git tag -a "$TAG" -m "$MESSAGE"
git push "$REMOTE" "refs/tags/$TAG"

echo "Tagged and pushed $TAG. release-mobile.yml takes it from here."

# The changelog can only include this version once the tag exists, so it has to
# be regenerated after tagging. CI can't commit it for you: the "Main" ruleset
# routes every change to main through a pull request, and a PR opened with
# GITHUB_TOKEN never gets its required checks, so it could never merge.
python3 .github/scripts/changelog.py --all --repo "$REPO" --output CHANGELOG.md

if git diff --quiet -- CHANGELOG.md; then
  echo "CHANGELOG.md was already current."
else
  echo
  echo "CHANGELOG.md now has a $TAG section. Open a PR with it:"
  echo "  git checkout -b docs/changelog-$TAG"
  echo "  git commit -m 'docs: add the $TAG changelog entry' -- CHANGELOG.md"
fi
