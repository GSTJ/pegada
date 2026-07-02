#!/usr/bin/env python3
"""Lint the Maestro quarantine file.

Fails the CI step (exit 1) if:
  - any entry is malformed (missing reason/owner/added)
  - any entry is older than MAX_AGE_DAYS (default: 30)

The age check is the anti-drift mechanism: quarantine is meant to be a
temporary escape hatch, not a permanent "skip" list. Stale entries
demand a follow-up — either fix the flow or downgrade it to extended.
"""

from __future__ import annotations

import argparse
import datetime as dt
import re
import sys
from pathlib import Path

MAX_AGE_DAYS = 30


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("path", type=Path)
    ap.add_argument("--max-age-days", type=int, default=MAX_AGE_DAYS)
    args = ap.parse_args()

    if not args.path.is_file():
        print(f"::error::quarantine file not found: {args.path}")
        return 1

    today = dt.date.today()
    failures: list[str] = []

    for line_no, raw in enumerate(args.path.read_text().splitlines(), start=1):
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        stem, _, rest = line.partition("#")
        stem = stem.strip()
        if not stem:
            failures.append(f"line {line_no}: blank flow stem")
            continue

        for key in ("reason", "owner", "added"):
            if not re.search(rf"{key}\s*:", rest, flags=re.IGNORECASE):
                failures.append(f"line {line_no} ({stem}): missing `{key}:`")

        m = re.search(r"added\s*:\s*(\d{4}-\d{2}-\d{2})", rest, flags=re.IGNORECASE)
        if m:
            try:
                added = dt.date.fromisoformat(m.group(1))
            except ValueError:
                failures.append(f"line {line_no} ({stem}): added date not ISO 8601")
                continue
            age = (today - added).days
            if age > args.max_age_days:
                failures.append(
                    f"line {line_no} ({stem}): quarantined for {age}d "
                    f"(>{args.max_age_days}d limit) — fix the flow or "
                    "downgrade to extended"
                )

    if failures:
        print("::error::Quarantine lint failed:")
        for msg in failures:
            print(f"  - {msg}")
        return 1

    print("Quarantine lint: ok")
    return 0


if __name__ == "__main__":
    sys.exit(main())
