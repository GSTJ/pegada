from __future__ import annotations

import os
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


SCRIPTS = Path(__file__).resolve().parent
CHANGELOG_SCRIPT = SCRIPTS / "changelog.py"
TAG_SCRIPT = SCRIPTS.parents[1] / "scripts" / "tag-release.sh"
MOBILE_DEPLOY_WORKFLOW = SCRIPTS.parents[1] / ".github" / "workflows" / "deploy-mobile.yml"


class MobileDeployWorkflowTest(unittest.TestCase):
    def test_publish_paths_cover_mobile_runtime_inputs(self) -> None:
        workflow = MOBILE_DEPLOY_WORKFLOW.read_text()

        self.assertIn('- "apps/mobile/**"', workflow)
        self.assertIn('- "packages/shared/**"', workflow)
        self.assertIn('- "pnpm-lock.yaml"', workflow)
        self.assertNotIn('- "apps/shared/**"', workflow)
        self.assertNotIn('- ".github/scripts/**"', workflow)


class GitRepositoryTest(unittest.TestCase):
    def setUp(self) -> None:
        self.temp_dir = tempfile.TemporaryDirectory()
        self.repo = Path(self.temp_dir.name) / "repo"
        self.repo.mkdir()
        self.git("init", "--initial-branch=main")
        self.git("config", "user.name", "Gabriel Taveira")
        self.git("config", "user.email", "gabrielstaveira@gmail.com")

    def tearDown(self) -> None:
        self.temp_dir.cleanup()

    def command(
        self, *args: str, check: bool = True, env: dict[str, str] | None = None
    ) -> subprocess.CompletedProcess[str]:
        return subprocess.run(
            args,
            cwd=self.repo,
            check=check,
            capture_output=True,
            text=True,
            env={**os.environ, **(env or {})},
        )

    def git(self, *args: str) -> str:
        return self.command("git", *args).stdout.strip()

    def commit(self, subject: str, body: str | None = None) -> None:
        marker = self.repo / "history.txt"
        with marker.open("a") as history:
            history.write(f"{subject}\n")
        self.git("add", "history.txt")
        command = ["commit", "-m", subject]
        if body:
            command += ["-m", body]
        self.git(*command)

    def tag(self, name: str, date: str) -> None:
        self.command(
            "git",
            "tag",
            "-a",
            name,
            "-m",
            name,
            env={"GIT_COMMITTER_DATE": date},
        )

    def changelog(self, *args: str) -> str:
        return self.command(sys.executable, str(CHANGELOG_SCRIPT), *args).stdout


class ChangelogTest(GitRepositoryTest):
    def setUp(self) -> None:
        super().setUp()
        self.commit("feat: initial release")
        self.tag("v1.0.0", "2026-08-01T12:00:00-03:00")

    def test_upcoming_entry_matches_the_tag_after_its_preparation_commit(self) -> None:
        self.commit("fix(release): keep changelog inside the tag")
        upcoming = self.changelog(
            "--all", "--upcoming", "v1.1.0", "--repo", "GSTJ/pegada"
        )
        notes_before = self.changelog(
            "--notes",
            "HEAD",
            "--previous",
            "v1.0.0",
            "--compare-ref",
            "v1.1.0",
            "--repo",
            "GSTJ/pegada",
        )

        (self.repo / "CHANGELOG.md").write_text(upcoming)
        self.git("add", "CHANGELOG.md")
        self.git("commit", "-m", "docs(release): prepare v1.1.0 changelog")
        self.tag("v1.1.0", "2026-08-02T12:00:00-03:00")

        notes_after = self.changelog(
            "--notes", "v1.1.0", "--previous", "v1.0.0", "--repo", "GSTJ/pegada"
        )
        tagged_changelog = self.changelog("--all", "--repo", "GSTJ/pegada")

        self.assertEqual(notes_before, notes_after)
        self.assertEqual(upcoming, tagged_changelog)
        self.assertNotIn("prepare v1.1.0 changelog", notes_after)

    def test_legacy_post_tag_changelog_commits_are_also_housekeeping(self) -> None:
        self.commit("docs: add the v1.0.0 changelog entry")
        self.commit("fix: the next real change")

        notes = self.changelog(
            "--notes", "HEAD", "--previous", "v1.0.0", "--compare-ref", "v1.0.1"
        )

        self.assertIn("the next real change", notes)
        self.assertNotIn("changelog entry", notes)

    def test_breaking_change_is_present_and_detected_for_an_upcoming_tag(self) -> None:
        self.commit(
            "feat(api)!: expire old sessions",
            "BREAKING CHANGE: Existing sessions need to sign in again.",
        )

        changelog = self.changelog("--all", "--upcoming", "v2.0.0")
        breaking = self.command(
            sys.executable,
            str(CHANGELOG_SCRIPT),
            "--is-breaking",
            "HEAD",
            "--previous",
            "v1.0.0",
            check=False,
        )

        self.assertEqual(breaking.returncode, 0)
        self.assertIn("### Breaking changes", changelog)
        self.assertIn("Existing sessions need to sign in again.", changelog)


class TagReleaseTest(GitRepositoryTest):
    def setUp(self) -> None:
        super().setUp()
        (self.repo / ".github" / "scripts").mkdir(parents=True)
        (self.repo / "scripts").mkdir()
        (self.repo / "apps" / "mobile").mkdir(parents=True)
        shutil.copy(CHANGELOG_SCRIPT, self.repo / ".github" / "scripts" / "changelog.py")
        shutil.copy(TAG_SCRIPT, self.repo / "scripts" / "tag-release.sh")
        (self.repo / "apps" / "mobile" / "app.config.ts").write_text(
            'const config = { version: "1.1.0", };\n'
        )
        self.commit("feat: initial release")
        self.git("add", ".github", "scripts", "apps")
        self.git("commit", "-m", "build: add release tooling")
        self.tag("v1.0.0", "2026-08-01T12:00:00-03:00")
        (self.repo / "CHANGELOG.md").write_text(
            self.changelog("--all", "--repo", "GSTJ/pegada")
        )
        self.git("add", "CHANGELOG.md")
        self.git("commit", "-m", "docs(release): prepare v1.0.0 changelog")

        self.remote = Path(self.temp_dir.name) / "remote.git"
        self.command("git", "init", "--bare", str(self.remote))
        self.git("remote", "add", "origin", str(self.remote))
        self.git("push", "-u", "origin", "main")
        self.git("push", "origin", "v1.0.0")

    def test_tag_is_blocked_until_the_generated_changelog_is_merged(self) -> None:
        self.commit("fix(release): keep changelog inside the tag")
        self.git("push", "origin", "main")

        first = self.command("./scripts/tag-release.sh", "v1.1.0", check=False)

        self.assertEqual(first.returncode, 1)
        self.assertIn("Prepared CHANGELOG.md for v1.1.0", first.stdout)
        self.assertEqual(self.git("tag", "--list", "v1.1.0"), "")

        self.git("add", "CHANGELOG.md")
        self.git("commit", "-m", "docs(release): prepare v1.1.0 changelog")
        self.git("push", "origin", "main")

        second = self.command("./scripts/tag-release.sh", "v1.1.0")

        self.assertIn("Tagged and pushed v1.1.0", second.stdout)
        remote_target = self.git(
            "ls-remote", "--tags", "origin", "refs/tags/v1.1.0^{}"
        ).split()[0]
        self.assertEqual(remote_target, self.git("rev-parse", "HEAD"))
        tag_message = self.git("for-each-ref", "refs/tags/v1.1.0", "--format=%(contents)")
        self.assertIn("keep changelog inside the tag", tag_message)
        self.assertNotIn("prepare v1.1.0 changelog", tag_message)
        self.assertEqual(
            (self.repo / "CHANGELOG.md").read_text(),
            self.changelog("--all", "--repo", "GSTJ/pegada"),
        )


if __name__ == "__main__":
    unittest.main()
