"""Tests for the E2E workflow's glue.

Two things are covered here, and they fail for different reasons:

  * maestro-run-shard.sh, which is what the Linux lane runs. Its whole job
    is to turn "did run-flow.sh succeed" into a JUnit file maestro-report.py
    can read, including the cases maestro's own JUnit cannot express — a
    post-check failure, a quarantined flow, a flow id that no longer names a
    file. Those are exactly the cases that would otherwise go green.

  * e2e-mobile.yml's gate structure. The required lane being hard-gated is a
    property somebody could delete in one line while "just" touching the
    extended lanes, and the shard flow lists are strings that drift silently
    from the .maestro directory.
"""

from __future__ import annotations

import re
import subprocess
import tempfile
import unittest
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parent
REPO = SCRIPTS.parents[1]
SHARD_SCRIPT = SCRIPTS / "maestro-run-shard.sh"
E2E_WORKFLOW = REPO / ".github" / "workflows" / "e2e-mobile.yml"
MAESTRO_DIR = REPO / "apps" / "mobile" / ".maestro"


class ShardRunnerTest(unittest.TestCase):
    """Drives the real script against a throwaway repo with a fake run-flow.sh.

    The fake is the point: this is a test of the wrapper's bookkeeping, not
    of Maestro. `30` passes, `31` fails with a post-check-shaped message.
    """

    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        (self.root / ".github" / "scripts").mkdir(parents=True)
        maestro = self.root / "apps" / "mobile" / ".maestro"
        (maestro / "scripts").mkdir(parents=True)

        (self.root / ".github" / "scripts" / "maestro-run-shard.sh").write_bytes(
            SHARD_SCRIPT.read_bytes()
        )
        (maestro / "30-fake-pass.yaml").write_text("")
        (maestro / "31-fake-fail.yaml").write_text("")
        (maestro / "quarantined.txt").write_text("# nothing quarantined\n")
        run_flow = maestro / "scripts" / "run-flow.sh"
        run_flow.write_text(
            "#!/usr/bin/env bash\n"
            'echo "==> maestro test flow $1"\n'
            'if [ "$1" = "31" ]; then echo \'[check-31] FAIL — "quoted" & <tagged>\'; exit 3; fi\n'
            "exit 0\n"
        )
        run_flow.chmod(0o755)

    def tearDown(self) -> None:
        self.temp.cleanup()

    def run_shard(self, *flow_ids: str, attempts: str = "1"):
        return subprocess.run(
            [
                "bash",
                ".github/scripts/maestro-run-shard.sh",
                "demo",
                *flow_ids,
            ],
            cwd=self.root,
            capture_output=True,
            text=True,
            env={"PATH": "/usr/bin:/bin:/usr/local/bin", "MAESTRO_SHARD_ATTEMPTS": attempts},
        )

    def junit(self) -> str:
        return (self.root / "maestro-results-demo.xml").read_text()

    def test_a_passing_flow_becomes_a_passing_suite(self) -> None:
        result = self.run_shard("30")

        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn('<testsuite name="30-fake-pass"', self.junit())
        self.assertIn('failures="0"', self.junit())

    def test_a_failing_post_check_fails_the_shard(self) -> None:
        """maestro's own JUnit cannot say this: the flow itself passed."""
        result = self.run_shard("31")

        self.assertEqual(result.returncode, 1)
        self.assertIn("<failure", self.junit())
        self.assertIn("run-flow.sh exited 3", self.junit())

    def test_failure_messages_are_xml_escaped(self) -> None:
        """A post-check that quotes the value it rejected must not break the file."""
        self.run_shard("31")
        junit = self.junit()

        self.assertIn("&quot;quoted&quot;", junit)
        self.assertIn("&amp;", junit)
        self.assertIn("&lt;tagged&gt;", junit)
        self.assertNotIn("<tagged>", junit)

    def test_a_flow_is_retried_before_being_called_a_failure(self) -> None:
        result = self.run_shard("31", attempts="3")

        self.assertEqual(result.stdout.count("attempt 1/3"), 1)
        self.assertEqual(result.stdout.count("attempt 3/3"), 1)
        self.assertIn("after 3 attempt(s)", self.junit())

    def test_a_quarantined_flow_is_skipped_not_run(self) -> None:
        (self.root / "apps" / "mobile" / ".maestro" / "quarantined.txt").write_text(
            "31-fake-fail  # reason: flaky; owner: @gstj; added: 2026-08-01\n"
        )

        result = self.run_shard("30", "31")

        self.assertEqual(result.returncode, 0, result.stdout)
        self.assertIn("skipping quarantined flow: 31-fake-fail", result.stdout)
        self.assertNotIn("31-fake-fail", self.junit())

    def test_a_renamed_away_flow_is_reported_rather_than_ignored(self) -> None:
        """The silent-coverage-loss case: a shard naming a file nobody kept."""
        result = self.run_shard("30", "99")

        self.assertEqual(result.returncode, 1)
        self.assertIn('name="99-MISSING"', self.junit())
        self.assertIn("drifted apart", self.junit())


class E2EWorkflowTest(unittest.TestCase):
    def setUp(self) -> None:
        self.workflow = E2E_WORKFLOW.read_text()

    def _job(self, name: str) -> str:
        """The block of YAML from `  <name>:` to the next job at that indent."""
        match = re.search(
            rf"^  {re.escape(name)}:\n(.*?)(?=^  [a-z][\w-]*:\n)",
            self.workflow,
            flags=re.MULTILINE | re.DOTALL,
        )
        self.assertIsNotNone(match, f"job {name} is missing from e2e-mobile.yml")
        assert match is not None
        return match.group(1)

    def test_the_required_lane_is_still_a_hard_gate(self) -> None:
        """The failure mode this file's header exists to prevent.

        JOB-level continue-on-error only. The required build legitimately
        carries a step-level one on its bundle-swap, which exists so a bad
        swap falls back to a full build instead of shipping a broken .app.
        """
        for job in ("build-ios-required", "e2e-ios-required"):
            self.assertNotIn(
                "\n    continue-on-error", "\n" + self._job(job), f"{job} is soft-gated"
            )
        self.assertIn("Required flows failed after 3 retries", self._job("e2e-ios-required"))

    def test_the_extended_lanes_stay_soft(self) -> None:
        for job in ("e2e-ios-extended", "e2e-android-extended"):
            self.assertIn("\n    continue-on-error: true", "\n" + self._job(job))

    def test_the_required_flow_list_is_unchanged(self) -> None:
        self.assertIn('REQUIRED_FLOWS: "01-launch"', self.workflow)

    def test_every_flow_named_by_a_shard_exists(self) -> None:
        """Shard membership is a string; the .maestro directory is not."""
        stems = {path.stem for path in MAESTRO_DIR.glob("*.yaml")}

        ios = re.findall(r'^\s+flows: "([^"]+)"$', self.workflow, flags=re.MULTILINE)
        self.assertTrue(ios, "no shard flow lists found")
        for shard in ios:
            for entry in re.split(r"[,\s]+", shard.strip()):
                if not entry:
                    continue
                if re.fullmatch(r"\d+[a-z]?", entry):
                    # The Linux lane names flows by numeric id.
                    self.assertTrue(
                        any(stem.startswith(f"{entry}-") for stem in stems),
                        f"no flow file for id {entry}",
                    )
                else:
                    self.assertIn(entry, stems, f"no flow file for stem {entry}")

    def test_the_linux_lane_runs_the_regression_guards_and_the_grand_journey(self) -> None:
        android = self._job("e2e-android-extended")

        self.assertIn('flows: "30 31 32 33 34 35 36 37 38 39 40 41 42"', android)
        self.assertIn('flows: "50"', android)

    def test_the_linux_lane_provides_its_own_backend(self) -> None:
        """Without MinIO's bucket, every photo upload 404s in silence."""
        android = self._job("e2e-android-extended")

        self.assertIn("packages/database/docker-compose.yml", android)
        self.assertIn("minio-init", android)
        self.assertIn("pnpm -F @pegada/nextjs dev", android)
        self.assertIn("migrate deploy", android)

    def test_the_grand_journey_accounts_are_magic_emails(self) -> None:
        """Flow 50 deletes account A mid-run if these fall out of the list."""
        android = self._job("e2e-android-extended")

        self.assertIn("journey-a@pegada.app", android)
        self.assertIn("journey-b@pegada.app", android)

    def test_flow_34_stays_off_the_lane_that_cannot_seed_it(self) -> None:
        """Its assertion is only true after its pre-script has run."""
        ios = self._job("e2e-ios-extended")

        self.assertNotIn("34-chat-day-separator", ios)


if __name__ == "__main__":
    unittest.main()
