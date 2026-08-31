from __future__ import annotations

import os
import re
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


SCRIPTS = Path(__file__).resolve().parent
CHANGELOG_SCRIPT = SCRIPTS / "changelog.py"
TAG_SCRIPT = SCRIPTS.parents[1] / "scripts" / "tag-release.sh"
VERIFY_SCRIPT = SCRIPTS / "verify-release-ref.py"
INSTALL_MAESTRO_SCRIPT = SCRIPTS / "install-maestro.sh"
MOBILE_DEPLOY_WORKFLOW = SCRIPTS.parents[1] / ".github" / "workflows" / "deploy-mobile.yml"
RELEASE_WORKFLOW = SCRIPTS.parents[1] / ".github" / "workflows" / "release-mobile.yml"
WORKFLOWS = SCRIPTS.parents[1] / ".github" / "workflows"


class MobileDeployWorkflowTest(unittest.TestCase):
    def test_publish_paths_cover_mobile_runtime_inputs(self) -> None:
        workflow = MOBILE_DEPLOY_WORKFLOW.read_text()

        self.assertIn('- "apps/mobile/**"', workflow)
        self.assertIn('- "packages/shared/**"', workflow)
        self.assertIn('- "pnpm-lock.yaml"', workflow)
        self.assertNotIn('- "apps/shared/**"', workflow)
        self.assertNotIn('- ".github/scripts/**"', workflow)


class WorkflowSupplyChainTest(unittest.TestCase):
    def test_every_external_action_is_pinned_to_a_commit(self) -> None:
        for workflow in WORKFLOWS.glob("*.yml"):
            for line in workflow.read_text().splitlines():
                match = re.search(r"\buses:\s*([^\s#]+)", line)
                if not match or match.group(1).startswith("./"):
                    continue
                self.assertRegex(
                    match.group(1),
                    r"@[0-9a-f]{40}$",
                    f"mutable action in {workflow.name}: {line.strip()}",
                )

    def test_release_tools_do_not_float_or_pipe_remote_code_to_a_shell(self) -> None:
        workflow_text = "\n".join(
            workflow.read_text() for workflow in WORKFLOWS.glob("*.yml")
        )

        self.assertNotIn("eas-version: latest", workflow_text)
        self.assertNotIn("npx --yes", workflow_text)
        for line in workflow_text.splitlines():
            if "run: pnpm install" in line:
                self.assertIn("--frozen-lockfile", line)
        self.assertNotRegex(workflow_text, r"curl[^\n]*\|[^\n]*(?:bash|sh)")
        self.assertIn("eas-version: 23.1.0", workflow_text)
        self.assertIn(
            "80185105a5d7e227e3b3fbcf225f45b312508ea676a9fc8e1b1aa1cac8b9ff6e",
            INSTALL_MAESTRO_SCRIPT.read_text(),
        )

    def test_secret_bearing_release_jobs_need_authorization_and_production(self) -> None:
        workflow = RELEASE_WORKFLOW.read_text()

        self.assertIn("authorize-release:", workflow)
        self.assertIn("verify-release-ref.py", workflow)
        self.assertEqual(workflow.count("needs: authorize-release"), 3)
        self.assertEqual(workflow.count("environment: production"), 4)


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

    def test_release_text_uses_plain_dashes(self) -> None:
        self.commit("fix: keep release notes readable \u2014 even from commit titles")

        changelog = self.changelog("--all", "--upcoming", "v1.1.0")

        self.assertNotIn("\u2014", changelog)
        self.assertIn("readable, even", changelog)


class TagReleaseTest(GitRepositoryTest):
    def setUp(self) -> None:
        super().setUp()
        (self.repo / ".github" / "scripts").mkdir(parents=True)
        (self.repo / "scripts").mkdir()
        (self.repo / "apps" / "mobile").mkdir(parents=True)
        shutil.copy(CHANGELOG_SCRIPT, self.repo / ".github" / "scripts" / "changelog.py")
        shutil.copy(VERIFY_SCRIPT, self.repo / ".github" / "scripts" / "verify-release-ref.py")
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

    def prepare_valid_release(self) -> None:
        self.commit("fix(release): keep changelog inside the tag")
        self.git("push", "origin", "main")

        first = self.command("./scripts/tag-release.sh", "v1.1.0", check=False)
        self.assertEqual(first.returncode, 1)

        self.git("add", "CHANGELOG.md")
        self.git("commit", "-m", "docs(release): prepare v1.1.0 changelog")
        self.git("push", "origin", "main")
        self.command("./scripts/tag-release.sh", "v1.1.0")

    def verify_release(
        self,
        *,
        event: str,
        ref: str,
        submit: str = "false",
        sha: str | None = None,
        check: bool = True,
    ) -> subprocess.CompletedProcess[str]:
        return self.command(
            sys.executable,
            str(self.repo / ".github" / "scripts" / "verify-release-ref.py"),
            "--event",
            event,
            "--ref",
            ref,
            "--sha",
            sha or self.git("rev-parse", "HEAD"),
            "--submit",
            submit,
            "--repo",
            "GSTJ/pegada",
            check=check,
        )

    def test_tag_is_blocked_until_the_generated_changelog_is_merged(self) -> None:
        self.prepare_valid_release()

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

    def test_valid_tag_passes_release_authorization(self) -> None:
        self.prepare_valid_release()

        result = self.verify_release(
            event="push", ref="refs/tags/v1.1.0", check=False
        )

        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("Authorized release tag v1.1.0", result.stdout)

    def test_off_main_tag_is_rejected(self) -> None:
        self.git("switch", "-c", "untrusted-release")
        self.commit("fix: off-main release")
        self.git("tag", "-a", "v1.1.0", "-m", "v1.1.0")

        result = self.verify_release(
            event="push", ref="refs/tags/v1.1.0", check=False
        )

        self.assertEqual(result.returncode, 1)
        self.assertIn("is not part of origin/main", result.stderr)

    def test_lightweight_release_tag_is_rejected(self) -> None:
        self.git("tag", "v1.1.0")

        result = self.verify_release(
            event="push", ref="refs/tags/v1.1.0", check=False
        )

        self.assertEqual(result.returncode, 1)
        self.assertIn("must be annotated", result.stderr)

    def test_store_submission_requires_a_release_tag(self) -> None:
        result = self.verify_release(
            event="workflow_dispatch",
            ref="refs/heads/main",
            submit="true",
            check=False,
        )

        self.assertEqual(result.returncode, 1)
        self.assertIn("store submission requires", result.stderr)

    def test_manual_main_build_without_submission_is_allowed(self) -> None:
        result = self.verify_release(
            event="workflow_dispatch", ref="refs/heads/main"
        )

        self.assertIn("Authorized manual build from main", result.stdout)


if __name__ == "__main__":
    unittest.main()
