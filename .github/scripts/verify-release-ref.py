#!/usr/bin/env python3
"""Reject release runs that did not start from a trusted main commit."""

from __future__ import annotations

import argparse
import re
import subprocess
import sys
import tempfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
CHANGELOG_SCRIPT = ROOT / ".github" / "scripts" / "changelog.py"
TAG_PATTERN = re.compile(
    r"^v(?P<version>[0-9]+\.[0-9]+\.[0-9]+)(?:-[0-9A-Za-z][0-9A-Za-z.-]*)?$"
)


def command(*args: str, check: bool = True) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        args,
        cwd=ROOT,
        check=check,
        capture_output=True,
        text=True,
    )


def git(*args: str) -> str:
    return command("git", *args).stdout.strip()


def reject(message: str) -> None:
    print(f"error: {message}", file=sys.stderr)
    raise SystemExit(1)


def parse_bool(value: str) -> bool:
    normalized = value.strip().lower()
    if normalized in {"true", "1"}:
        return True
    if normalized in {"false", "0", ""}:
        return False
    reject(f"invalid boolean value: {value}")


def previous_tag(tag: str) -> str | None:
    tags = git("tag", "--list", "v*", "--sort=-creatordate").splitlines()
    if tag not in tags:
        reject(f"tag {tag} is not present in the checkout")
    index = tags.index(tag)
    return tags[index + 1] if index + 1 < len(tags) else None


def generated_notes(tag: str, previous: str | None, repo: str) -> str:
    args = [
        sys.executable,
        str(CHANGELOG_SCRIPT),
        "--notes",
        tag,
        "--repo",
        repo,
    ]
    if previous:
        args += ["--previous", previous]
    return command(*args).stdout


def is_breaking(tag: str, previous: str | None) -> bool:
    args = [
        sys.executable,
        str(CHANGELOG_SCRIPT),
        "--is-breaking",
        tag,
    ]
    if previous:
        args += ["--previous", previous]
    result = command(*args, check=False)
    if result.returncode not in {0, 1}:
        reject(f"breaking-change check failed for {tag}")
    return result.returncode == 0


def tag_message(tag: str) -> str:
    raw = command("git", "cat-file", "tag", tag).stdout
    headers, separator, message = raw.partition("\n\n")
    if not separator or not headers:
        reject(f"could not read annotated tag message for {tag}")
    return message


def verify_changelog(repo: str) -> None:
    with tempfile.TemporaryDirectory() as temp_dir:
        generated = Path(temp_dir) / "CHANGELOG.md"
        command(
            sys.executable,
            str(CHANGELOG_SCRIPT),
            "--all",
            "--repo",
            repo,
            "--output",
            str(generated),
        )
        if generated.read_bytes() != (ROOT / "CHANGELOG.md").read_bytes():
            reject("CHANGELOG.md does not match the tagged history")


def verify_tag(tag: str, sha: str, repo: str) -> None:
    match = TAG_PATTERN.fullmatch(tag)
    if not match:
        reject(f"release tag is not semantic: {tag}")

    tag_ref = f"refs/tags/{tag}"
    if git("cat-file", "-t", tag_ref) != "tag":
        reject(f"release tag must be annotated: {tag}")

    tag_commit = git("rev-parse", f"{tag_ref}^{{commit}}")
    if tag_commit != sha:
        reject(f"workflow SHA {sha} does not match {tag} target {tag_commit}")

    config = (ROOT / "apps" / "mobile" / "app.config.ts").read_text()
    version = re.search(r'\bversion:\s*"([^"]+)"', config)
    if not version:
        reject("could not read the mobile version")
    if version.group(1) != match.group("version"):
        reject(
            f"tag version {match.group('version')} does not match mobile version "
            f"{version.group(1)}"
        )

    previous = previous_tag(tag)
    notes = generated_notes(tag, previous, repo)
    title = f"{tag} (contains breaking changes)" if is_breaking(tag, previous) else tag
    expected_message = f"{title}\n\n{notes}"
    if tag_message(tag) != expected_message:
        reject(f"annotated tag message does not match generated notes for {tag}")

    verify_changelog(repo)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--event", required=True)
    parser.add_argument("--ref", required=True)
    parser.add_argument("--sha", required=True)
    parser.add_argument("--submit", default="false")
    parser.add_argument("--repo", default="GSTJ/pegada")
    args = parser.parse_args()

    sha = git("rev-parse", f"{args.sha}^{{commit}}")
    if command(
        "git", "merge-base", "--is-ancestor", sha, "refs/remotes/origin/main", check=False
    ).returncode:
        reject(f"release commit {sha} is not part of origin/main")

    submit = parse_bool(args.submit)
    if args.ref == "refs/heads/main":
        if args.event != "workflow_dispatch":
            reject("main is only valid for a manual build")
        if submit:
            reject("store submission requires an annotated release tag")
        print(f"Authorized manual build from main at {sha}")
        return 0

    prefix = "refs/tags/"
    if not args.ref.startswith(prefix):
        reject("release runs are limited to main and semantic release tags")

    tag = args.ref.removeprefix(prefix)
    if args.event not in {"push", "workflow_dispatch"}:
        reject(f"unsupported release event: {args.event}")

    verify_tag(tag, sha, args.repo)
    print(f"Authorized release tag {tag} at {sha}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
