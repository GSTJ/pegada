#!/usr/bin/env python3
"""Compute per-flow failure rate from the last N e2e-mobile.yml runs.

Pulls the JUnit XML artifacts uploaded by each run, parses them, and
writes a markdown table to $GITHUB_STEP_SUMMARY. The output is meant
to inform decisions like:

  - Flow X has 0% failure rate over 20 runs -> graduate to required.
  - Flow Y has 80% failure rate -> add to quarantine.
  - Flow Z has 5% failure rate -> investigate flake before promoting.

This is intentionally read-only. It does NOT block CI; the per-PR
required/extended split is the source of truth for blocking. This
job's purpose is observability.

Requires: gh CLI authenticated as a token with `actions:read` scope.
"""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import tempfile
import xml.etree.ElementTree as ET
import zipfile
from collections import defaultdict
from pathlib import Path


def gh_json(*args: str) -> list | dict:
    out = subprocess.check_output(["gh", *args], text=True)
    return json.loads(out)


def list_recent_runs(workflow: str, repo: str, limit: int) -> list[dict]:
    return gh_json(
        "run",
        "list",
        "--workflow",
        workflow,
        "--repo",
        repo,
        "--limit",
        str(limit),
        "--json",
        "databaseId,conclusion,headBranch,createdAt,event",
    )


def download_artifact(repo: str, run_id: int, name: str, dest: Path) -> bool:
    """Download a single artifact by name. Returns False if not present."""
    try:
        subprocess.check_output(
            [
                "gh",
                "run",
                "download",
                str(run_id),
                "--repo",
                repo,
                "--name",
                name,
                "--dir",
                str(dest),
            ],
            stderr=subprocess.STDOUT,
            text=True,
        )
        return True
    except subprocess.CalledProcessError:
        return False


def parse_run_junits(dir_: Path) -> dict[str, bool]:
    """Map flow-stem -> passed (True/False) across all xml in dir_."""
    out: dict[str, bool] = {}
    for xml in dir_.rglob("*.xml"):
        try:
            root = ET.parse(xml).getroot()
        except ET.ParseError:
            continue
        for suite in root.iter("testsuite"):
            name = suite.get("name") or "unknown"
            failed = any(b.tag in ("failure", "error") for b in suite.iter())
            # Last write wins; ok because we only run each flow once per job.
            out[name] = not failed
    return out


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--workflow", default="e2e-mobile.yml")
    ap.add_argument("--repo", default=os.environ.get("GITHUB_REPOSITORY", ""))
    ap.add_argument("--limit", type=int, default=20)
    ap.add_argument(
        "--summary",
        type=Path,
        default=Path(os.environ.get("GITHUB_STEP_SUMMARY", "/dev/stdout")),
    )
    args = ap.parse_args()

    if not args.repo:
        print("::error::--repo or $GITHUB_REPOSITORY required", file=sys.stderr)
        return 1

    runs = list_recent_runs(args.workflow, args.repo, args.limit)
    if not runs:
        with args.summary.open("a") as fh:
            fh.write("## Maestro flake stats\n\n_No runs found._\n")
        return 0

    # flow-stem -> [pass_count, total_count]
    stats: dict[str, list[int]] = defaultdict(lambda: [0, 0])
    inspected = 0

    with tempfile.TemporaryDirectory() as tmp:
        tmp_path = Path(tmp)
        for run in runs:
            run_id = run["databaseId"]
            run_dir = tmp_path / str(run_id)
            run_dir.mkdir()
            # Artifact names produced by this workflow.
            for artifact_name in ("maestro-results-required", "maestro-results-extended"):
                ok = download_artifact(args.repo, run_id, artifact_name, run_dir)
                if not ok:
                    continue
                results = parse_run_junits(run_dir)
                for stem, passed in results.items():
                    stats[stem][1] += 1
                    if passed:
                        stats[stem][0] += 1
            inspected += 1

    lines = [
        f"## Maestro flake stats (last {inspected} runs of `{args.workflow}`)",
        "",
        "| Flow | Pass rate | Pass | Total | Verdict |",
        "|---|---|---|---|---|",
    ]
    if not stats:
        lines.append(
            "_No JUnit artifacts found in recent runs. "
            "The workflow either didn't reach the maestro step or didn't upload artifacts._"
        )
    else:
        for stem in sorted(stats):
            passes, total = stats[stem]
            rate = (passes / total * 100) if total else 0.0
            if total < 5:
                verdict = "low-signal"
            elif rate >= 95:
                verdict = "stable — candidate for required"
            elif rate <= 30:
                verdict = "broken — quarantine or fix"
            elif rate < 80:
                verdict = "flaky — investigate"
            else:
                verdict = "ok"
            lines.append(f"| `{stem}` | {rate:.0f}% | {passes} | {total} | {verdict} |")

    with args.summary.open("a") as fh:
        fh.write("\n".join(lines) + "\n")
    print("\n".join(lines))
    return 0


if __name__ == "__main__":
    sys.exit(main())
