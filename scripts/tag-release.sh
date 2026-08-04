#!/usr/bin/env bash
# Tag a release from apps/mobile/app.config.ts's version.
#
# The tag is ANNOTATED and its message is the generated release notes, so
# `git show <tag>` tells you what shipped without a network round trip, and it
# matches the GitHub release body byte for byte (release-mobile.yml runs the
# same generator on the same range). CHANGELOG.md has to be committed through a
# PR before the tag can be created, since the ruleset on main requires one.
#
#   ./scripts/tag-release.sh              # v<version from app.config.ts>
#   ./scripts/tag-release.sh v1.5.0-rc1   # explicit, e.g. a release candidate
#   DRY_RUN=1 ./scripts/tag-release.sh    # report readiness, change nothing
#
# Pushing the tag is what starts release-mobile.yml: the native builds and the
# GitHub release. It never submits to a store on its own.
set -euo pipefail

cd "$(dirname "$0")/.."

REPO=${REPO:-GSTJ/pegada}
REMOTE=${REMOTE:-origin}
RELEASE_BRANCH=${RELEASE_BRANCH:-main}

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

# A dry run is useful from a release PR. Every mutating run must start from a
# clean, current release branch so the generated commit links and tag target
# cannot come from an unmerged branch or stale checkout.
if [ "${DRY_RUN:-0}" != "1" ]; then
  BRANCH=$(git symbolic-ref --quiet --short HEAD || true)
  if [ "$BRANCH" != "$RELEASE_BRANCH" ]; then
    echo "error: releases must be prepared from $RELEASE_BRANCH (currently ${BRANCH:-detached HEAD})" >&2
    exit 1
  fi

  if [ -n "$(git status --porcelain)" ]; then
    echo "error: working tree must be clean before preparing a release" >&2
    exit 1
  fi

  git fetch "$REMOTE" "$RELEASE_BRANCH"
  if [ "$(git rev-parse HEAD)" != "$(git rev-parse FETCH_HEAD)" ]; then
    echo "error: HEAD must match $REMOTE/$RELEASE_BRANCH before preparing a release" >&2
    exit 1
  fi
fi

PREVIOUS=$(git tag --list 'v*' --sort=-creatordate | head -1)
NOTES=$(python3 .github/scripts/changelog.py \
  --notes HEAD \
  --previous "$PREVIOUS" \
  --compare-ref "$TAG" \
  --repo "$REPO")

TITLE="$TAG"
if python3 .github/scripts/changelog.py --is-breaking HEAD --previous "$PREVIOUS" >/dev/null; then
  TITLE="$TAG (contains breaking changes)"
fi

# Build the exact changelog the tag will contain before creating the tag. The
# first invocation writes this file and stops so it can go through a PR. Once
# that PR is merged, a second invocation sees no diff and may tag main. The
# docs(release) preparation commit is intentionally omitted by changelog.py,
# so the pre-tag entry, annotated tag and GitHub release stay identical.
EXPECTED_CHANGELOG=$(mktemp)
trap 'rm -f "$EXPECTED_CHANGELOG"' EXIT
python3 .github/scripts/changelog.py \
  --all \
  --upcoming "$TAG" \
  --repo "$REPO" \
  --output "$EXPECTED_CHANGELOG"

if ! cmp -s "$EXPECTED_CHANGELOG" CHANGELOG.md; then
  if [ "${DRY_RUN:-0}" = "1" ]; then
    printf '%s\n\n%s\n' "$TITLE" "$NOTES"
    echo
    echo "(dry run, CHANGELOG.md still needs the $TAG entry)"
    exit 1
  fi

  cp "$EXPECTED_CHANGELOG" CHANGELOG.md
  echo "Prepared CHANGELOG.md for $TAG. Commit it through a PR with:"
  echo "  docs(release): prepare $TAG changelog"
  echo
  echo "Run this script again from updated $RELEASE_BRANCH after that PR merges."
  exit 1
fi

if [ "${DRY_RUN:-0}" = "1" ]; then
  printf '%s\n\n%s\n' "$TITLE" "$NOTES"
  echo
  echo "(dry run, CHANGELOG.md is ready; nothing tagged)"
  exit 0
fi

if [ -n "$(git status --porcelain)" ]; then
  echo "error: working tree must be clean before tagging" >&2
  exit 1
fi

printf '%s\n\n%s\n' "$TITLE" "$NOTES" \
  | git tag -a --cleanup=verbatim "$TAG" -F -
git push "$REMOTE" "refs/tags/$TAG"

echo "Tagged and pushed $TAG. release-mobile.yml takes it from here."
