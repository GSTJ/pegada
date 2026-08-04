#!/usr/bin/env python3
"""Build release notes from conventional commits.

One generator feeds all three places a release shows up, so they can't
disagree with each other:

  - CHANGELOG.md          `--all` regenerates the whole file from git history
  - the annotated tag     `scripts/tag-release.sh` uses `--notes` as the message
  - the GitHub release    release-mobile.yml passes the same `--notes` output

A breaking change is a `!` before the colon (`feat(api)!: ...`) or a
`BREAKING CHANGE:` / `BREAKING-CHANGE:` footer, per the conventional commits
spec. Either one puts the commit under the Breaking changes heading at the top
of its section, keeps its footer text, and makes `--is-breaking` exit 0, which
is what marks the release title.

Commits that don't parse as conventional aren't dropped; they land under Other
so nothing silently disappears from a release.
"""

from __future__ import annotations

import argparse
import re
import subprocess
import sys
from pathlib import Path

# Unit/record separators, not NUL: argv strings can't carry an embedded NUL.
RECORD = "\x1e"
FIELD = "\x1f"

# Ordered: this is the order sections appear under a version.
SECTIONS: list[tuple[str, tuple[str, ...]]] = [
    ("Features", ("feat",)),
    ("Fixes", ("fix",)),
    ("Performance", ("perf",)),
    ("Reverts", ("revert",)),
    ("Dependencies", ("deps",)),
    ("Refactors", ("refactor",)),
    ("Documentation", ("docs",)),
    ("Tests", ("test",)),
    ("Build and CI", ("build", "ci")),
    ("Chores", ("chore", "style")),
]

BREAKING_HEADING = "Breaking changes"
OTHER_HEADING = "Other"

HEADER = re.compile(r"^(?P<type>[a-zA-Z]+)(?:\((?P<scope>[^)]*)\))?(?P<bang>!)?:\s*(?P<subject>.+)$")
TRAILING_PR = re.compile(r"\s*\(#(?P<number>\d+)\)\s*$")

# Conventional commits footers are `token: value` or `token #value`, where the
# token is one word. A footer runs until the next one, so a BREAKING CHANGE
# explanation can span several lines and all of them belong in the changelog.
FOOTER = re.compile(r"^(?P<token>[A-Za-z][A-Za-z-]*|BREAKING CHANGE)(?::[ \t]|[ ]#)(?P<value>.*)$")


def breaking_notes(body: str) -> list[str]:
    notes: list[list[str]] = []
    current: list[str] | None = None

    for line in body.splitlines():
        match = FOOTER.match(line)
        if match:
            if match.group("token").upper().replace("-", " ") == "BREAKING CHANGE":
                current = [match.group("value").strip()]
                notes.append(current)
            else:
                current = None
            continue
        if current is not None:
            current.append(line.strip())

    return [
        " ".join(part for part in note if part).strip()
        for note in notes
        if any(part.strip() for part in note)
    ]


class Commit:
    def __init__(self, sha: str, subject: str, body: str) -> None:
        self.sha = sha
        self.body = body

        subject, self.pr = self._split_pr(subject)
        match = HEADER.match(subject)

        self.type = (match.group("type").lower() if match else "").strip()
        self.scope = (match.group("scope") or "").strip() if match else ""
        self.subject = (match.group("subject") if match else subject).strip()
        self.breaking_notes = breaking_notes(body)
        self.breaking = bool(match and match.group("bang")) or bool(self.breaking_notes)

    @property
    def is_release_housekeeping(self) -> bool:
        """Whether this commit only prepared the changelog for its own tag.

        A release changelog has to be merged before the tag points at it. That
        preparation commit is therefore inside the release range, but listing
        it in the release notes would make the generated pre-tag entry differ
        from the tag and GitHub release generated after the merge.

        Keep this deliberately narrow: normal documentation commits still ship
        in the changelog. Only the conventional subject emitted by
        ``scripts/tag-release.sh`` is release housekeeping.
        """
        return self.type == "docs" and bool(
            (self.scope == "release" and re.fullmatch(r"prepare v\S+ changelog", self.subject))
            or (not self.scope and re.fullmatch(r"add the v\S+ changelog entry", self.subject))
        )

    @staticmethod
    def _split_pr(subject: str) -> tuple[str, str | None]:
        """Squash merges end in `(#123)`. Keep the number, drop it from the text."""
        match = TRAILING_PR.search(subject)
        if not match:
            return subject.strip(), None
        return TRAILING_PR.sub("", subject).strip(), match.group("number")

    @property
    def heading(self) -> str:
        for heading, types in SECTIONS:
            if self.type in types:
                return heading
        return OTHER_HEADING

    def render(self, repo: str | None) -> str:
        scope = f"**{self.scope}:** " if self.scope else ""
        line = f"- {scope}{self.subject}"

        if self.pr and repo:
            line += f" ([#{self.pr}](https://github.com/{repo}/pull/{self.pr}))"
        elif self.pr:
            line += f" (#{self.pr})"

        if repo:
            line += f" ([`{self.sha[:7]}`](https://github.com/{repo}/commit/{self.sha}))"
        else:
            line += f" (`{self.sha[:7]}`)"

        return line

    def render_breaking(self, repo: str | None) -> str:
        lines = [self.render(repo)]
        lines += [f"  {note}" for note in self.breaking_notes]
        return "\n".join(lines)


def git(*args: str) -> str:
    return subprocess.run(
        ["git", *args], check=True, capture_output=True, text=True
    ).stdout.strip()


def read_commits(rev_range: str) -> list[Commit]:
    raw = git("log", "--no-merges", f"--format=%H{FIELD}%s{FIELD}%b{RECORD}", rev_range)
    commits = []
    for record in raw.split(RECORD):
        record = record.strip("\n")
        if not record.strip():
            continue
        sha, subject, body = (record.split(FIELD, 2) + ["", ""])[:3]
        commit = Commit(sha, subject, body)
        if not commit.is_release_housekeeping:
            commits.append(commit)
    return commits


def render_body(commits: list[Commit], repo: str | None) -> str:
    breaking = [commit for commit in commits if commit.breaking]
    blocks: list[str] = []

    if breaking:
        rendered = "\n".join(commit.render_breaking(repo) for commit in breaking)
        blocks.append(f"### {BREAKING_HEADING}\n\n{rendered}")

    for heading, types in [*SECTIONS, (OTHER_HEADING, ())]:
        group = [
            commit
            for commit in commits
            if commit.heading == heading and not commit.breaking
        ]
        if group:
            rendered = "\n".join(commit.render(repo) for commit in group)
            blocks.append(f"### {heading}\n\n{rendered}")

    if not blocks:
        return "No commits in this release."

    return "\n\n".join(blocks)


def tag_date(ref: str) -> str:
    return git("log", "-1", "--format=%ad", "--date=short", ref)


def sorted_tags(pattern: str) -> list[str]:
    raw = git("tag", "--list", pattern, "--sort=-creatordate")
    return [tag for tag in raw.splitlines() if tag.strip()]


def compare_link(repo: str | None, previous: str | None, current: str) -> str | None:
    if not repo:
        return None
    if previous:
        return f"[Full diff](https://github.com/{repo}/compare/{previous}...{current})"
    return f"[Full history](https://github.com/{repo}/commits/{current})"


def section(
    repo: str | None,
    previous: str | None,
    current: str,
    heading_level: int,
    *,
    revision: str | None = None,
) -> str:
    target = revision or current
    rev_range = f"{previous}..{target}" if previous else target
    body = render_body(read_commits(rev_range), repo)
    link = compare_link(repo, previous, current)

    heading = "#" * heading_level
    parts = [f"{heading} {current} ({tag_date(target)})", "", body]
    if link:
        parts += ["", link]
    return "\n".join(parts)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo", help="owner/name, for commit and PR links")
    parser.add_argument(
        "--compare-ref",
        help="override only the ref shown in the Full diff/history link",
    )
    parser.add_argument("--tag-pattern", default="v*", help="which tags count as releases")
    parser.add_argument(
        "--upcoming",
        metavar="TAG",
        help="prepend an untagged release from the newest tag through HEAD (with --all)",
    )
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--notes", metavar="TAG", help="print one release's notes")
    mode.add_argument("--all", action="store_true", help="print the whole changelog")
    mode.add_argument(
        "--is-breaking",
        metavar="TAG",
        help="exit 0 when the release contains a breaking change, 1 when it doesn't",
    )
    parser.add_argument("--previous", help="override the tag to diff against")
    parser.add_argument("--output", type=Path, help="write to this file instead of stdout")
    args = parser.parse_args()

    tags = sorted_tags(args.tag_pattern)

    if args.upcoming and not args.all:
        parser.error("--upcoming requires --all")
    if args.upcoming in tags:
        parser.error(f"--upcoming tag already exists: {args.upcoming}")

    def previous_of(tag: str) -> str | None:
        if args.previous is not None:
            return args.previous or None
        if tag not in tags:
            # Notes for a tag that isn't pushed yet: diff against the newest one.
            return tags[0] if tags else None
        index = tags.index(tag)
        return tags[index + 1] if index + 1 < len(tags) else None

    if args.is_breaking:
        rev_range = (
            f"{previous_of(args.is_breaking)}..{args.is_breaking}"
            if previous_of(args.is_breaking)
            else args.is_breaking
        )
        return 0 if any(commit.breaking for commit in read_commits(rev_range)) else 1

    if args.notes:
        text = render_body(
            read_commits(
                f"{previous_of(args.notes)}..{args.notes}"
                if previous_of(args.notes)
                else args.notes
            ),
            args.repo,
        )
        link = compare_link(
            args.repo, previous_of(args.notes), args.compare_ref or args.notes
        )
        if link:
            text += f"\n\n{link}"
    else:
        if not tags:
            print("No tags match the pattern, nothing to generate.", file=sys.stderr)
            return 1
        blocks = [
            "# Changelog",
            "",
            "Generated from conventional commits by `.github/scripts/changelog.py`."
            " Run `pnpm changelog` to refresh it.",
        ]
        if args.upcoming:
            blocks.append("")
            blocks.append(
                section(
                    args.repo,
                    tags[0] if tags else None,
                    args.upcoming,
                    heading_level=2,
                    revision="HEAD",
                )
            )
        for index, tag in enumerate(tags):
            previous = tags[index + 1] if index + 1 < len(tags) else None
            blocks.append("")
            blocks.append(section(args.repo, previous, tag, heading_level=2))
        text = "\n".join(blocks)

    text = text.rstrip("\n") + "\n"

    if args.output:
        args.output.write_text(text)
    else:
        sys.stdout.write(text)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
