#!/usr/bin/env python3
"""Decide whether a push changes inputs to the mobile bundle."""
import json
import subprocess
import sys


def git(*args):
    return subprocess.check_output(["git", *args])


def update_needed(before, after):
    # A new branch or unavailable history must not silently suppress a release.
    try:
        paths = git("diff", "--name-only", "-z", before, after).decode().split("\0")
        for path in paths:
            if path == "apps/mobile/package.json":
                old = json.loads(git("show", f"{before}:{path}"))
                new = json.loads(git("show", f"{after}:{path}"))
                old.pop("jest", None)
                new.pop("jest", None)
                if old != new:
                    return True
            elif path.startswith(("apps/mobile/", "packages/shared/")) or path == "pnpm-lock.yaml":
                return True
        return False
    except (subprocess.CalledProcessError, ValueError):
        return True


if __name__ == "__main__":
    print(f"publish={str(update_needed(*sys.argv[1:])).lower()}")
