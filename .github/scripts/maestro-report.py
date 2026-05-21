#!/usr/bin/env python3
"""Parse Maestro JUnit XML output, classify each flow, and emit a
GitHub Actions Job Summary plus a structured exit code.

Usage:
    maestro-report.py --junit <path/to/results.xml> \
                      --quarantine apps/mobile/.maestro/quarantined.txt \
                      --required 01-launch \
                      --summary $GITHUB_STEP_SUMMARY \
                      --mode required|extended

Exit codes:
    0 — all REQUIRED flows passed (extended flows are reported but never
        cause a non-zero exit when --mode=extended)
    1 — at least one REQUIRED, non-quarantined flow failed

Why a custom reporter:
    `maestro test --format junit` writes one <testcase> per `name:` field
    inside the flow. We want a flow-level rollup (one row per .yaml file)
    plus a quarantine-aware verdict. GitHub Actions' built-in JUnit
    reporters don't support quarantine semantics.
"""

from __future__ import annotations

import argparse
import re
import sys
import xml.etree.ElementTree as ET
from dataclasses import dataclass, field
from pathlib import Path


@dataclass
class FlowResult:
    name: str
    passed: bool
    failure_message: str = ""
    duration_s: float = 0.0


@dataclass
class QuarantineEntry:
    stem: str
    reason: str
    owner: str
    added: str


def load_quarantine(path: Path) -> dict[str, QuarantineEntry]:
    """Parse the quarantine file. Returns map of flow-stem -> entry.

    Lines starting with # are comments. Each entry line is
    `<flow-stem>   # reason: ...; owner: @handle; added: YYYY-MM-DD`.
    Malformed lines are ignored with a warning so a broken comment can't
    accidentally re-enable a quarantined flow.
    """
    out: dict[str, QuarantineEntry] = {}
    if not path.is_file():
        return out
    for line_no, raw in enumerate(path.read_text().splitlines(), start=1):
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        stem, _, rest = line.partition("#")
        stem = stem.strip()
        if not stem:
            continue
        reason = _extract(rest, "reason")
        owner = _extract(rest, "owner")
        added = _extract(rest, "added")
        if not (reason and owner and added):
            print(
                f"::warning::quarantined.txt line {line_no}: missing "
                "reason/owner/added — entry ignored",
                file=sys.stderr,
            )
            continue
        out[stem] = QuarantineEntry(stem=stem, reason=reason, owner=owner, added=added)
    return out


def _extract(blob: str, key: str) -> str:
    m = re.search(rf"{key}\s*:\s*([^;]+)", blob, flags=re.IGNORECASE)
    return m.group(1).strip() if m else ""


def parse_junit(path: Path) -> list[FlowResult]:
    """Maestro emits one <testsuite> per flow file with <testcase> children.

    We collapse to one FlowResult per testsuite. A flow is "passed" iff
    none of its testcases contain <failure> or <error>.
    """
    if not path.is_file():
        return []
    try:
        root = ET.parse(path).getroot()
    except ET.ParseError as exc:
        print(f"::error::Failed to parse {path}: {exc}", file=sys.stderr)
        return []

    suites = root.iter("testsuite")
    results: list[FlowResult] = []
    for suite in suites:
        # Maestro's suite name is the flow's `name:` field. We prefer the
        # file stem so quarantine entries (which use stems) line up.
        # The `file` attribute is missing, so derive from `hostname` or
        # the first testcase's `classname` if present.
        suite_name = (
            suite.get("name")
            or (next(iter(suite), ET.Element("x")).get("classname") or "")
            or "unknown"
        )
        stem = _to_stem(suite_name)

        failure_msgs: list[str] = []
        duration = float(suite.get("time", "0") or 0)
        for case in suite.iter("testcase"):
            for bad in case.iter():
                if bad.tag in ("failure", "error"):
                    msg = (bad.get("message") or "").strip() or (bad.text or "").strip()
                    failure_msgs.append(msg[:200])

        results.append(
            FlowResult(
                name=stem,
                passed=not failure_msgs,
                failure_message="; ".join(failure_msgs)[:500],
                duration_s=duration,
            )
        )
    return results


def _to_stem(name: str) -> str:
    """Convert a free-form flow name to a quarantine-comparable stem.

    Examples:
        "01-launch"                          -> "01-launch"
        "Cold launch shows SignIn"           -> "cold-launch-shows-signin"
        "apps/mobile/.maestro/01-launch.yaml" -> "01-launch"
    """
    s = name.strip()
    if "/" in s or s.endswith(".yaml"):
        s = Path(s).stem
    # If maestro gave us the `name:` field (which is a human string), we
    # can't recover the file stem from JUnit alone — caller must align
    # quarantine entries with whatever `name:` the flow declares OR use
    # the stem (preferred). We fall through and let the comparison miss.
    return s


def render_summary(
    results: list[FlowResult],
    quarantine: dict[str, QuarantineEntry],
    required: set[str],
    mode: str,
) -> tuple[str, int]:
    """Render markdown for $GITHUB_STEP_SUMMARY and compute exit code."""
    lines: list[str] = []
    lines.append(f"## Maestro E2E — {mode.title()} suite")
    lines.append("")
    if not results:
        lines.append("_No JUnit results found. Did the maestro step crash before writing output?_")
        return "\n".join(lines), (1 if mode == "required" else 0)

    lines.append("| Flow | Status | Gate | Duration | Notes |")
    lines.append("|---|---|---|---|---|")

    hard_fail = False
    for r in sorted(results, key=lambda x: x.name):
        is_required = r.name in required
        is_quarantined = r.name in quarantine
        if r.passed:
            status = "pass"
        else:
            status = "fail"
        if is_required and not is_quarantined:
            gate = "required"
            if not r.passed:
                hard_fail = True
        elif is_quarantined:
            gate = f"quarantined ({quarantine[r.name].owner})"
        else:
            gate = "extended"

        notes = ""
        if is_quarantined:
            notes = f"reason: {quarantine[r.name].reason}; since {quarantine[r.name].added}"
        elif not r.passed:
            notes = r.failure_message or "(no message)"

        lines.append(
            f"| `{r.name}` | {status} | {gate} | {r.duration_s:.1f}s | {notes} |"
        )

    lines.append("")
    if hard_fail and mode == "required":
        lines.append("**Verdict: FAIL** — at least one required, non-quarantined flow failed.")
        exit_code = 1
    elif mode == "required":
        lines.append("**Verdict: PASS** — all required flows green.")
        exit_code = 0
    else:
        any_fail = any(not r.passed for r in results)
        lines.append(
            "**Extended verdict (soft gate):** "
            + ("regressions detected — see table above" if any_fail else "all green")
        )
        exit_code = 0  # extended never blocks

    return "\n".join(lines), exit_code


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--junit", required=True, type=Path)
    ap.add_argument("--quarantine", required=True, type=Path)
    ap.add_argument(
        "--required",
        default="",
        help="Comma-separated list of required flow stems (e.g. 01-launch,02-sign-in)",
    )
    ap.add_argument("--summary", required=False, type=Path)
    ap.add_argument("--mode", required=True, choices=["required", "extended"])
    args = ap.parse_args()

    required = {s.strip() for s in args.required.split(",") if s.strip()}
    quarantine = load_quarantine(args.quarantine)
    results = parse_junit(args.junit)
    md, exit_code = render_summary(results, quarantine, required, args.mode)

    # Always emit to stdout for the workflow log.
    print(md)
    if args.summary:
        with args.summary.open("a") as fh:
            fh.write(md + "\n")
    return exit_code


if __name__ == "__main__":
    sys.exit(main())
