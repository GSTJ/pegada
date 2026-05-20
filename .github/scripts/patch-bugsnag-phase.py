"""
Brace-aware .pbxproj patcher: find the Bugsnag build phase block and
replace its shellScript with "exit 0" so CI builds don't fail when
BUGSNAG_API_KEY is not set (CI never has it).

Usage:
    PBXPROJ=path/to/project.pbxproj python3 patch-bugsnag-phase.py

The script exits 0 on success (whether or not a phase was found) and
prints a human-readable summary so the CI log is informative.
"""
import re
import sys
import os

pbxproj = os.environ.get("PBXPROJ", "")
if not pbxproj:
    print("ERROR: PBXPROJ environment variable is not set", file=sys.stderr)
    sys.exit(1)

try:
    src = open(pbxproj).read()
except OSError as exc:
    print(f"ERROR: cannot read {pbxproj}: {exc}", file=sys.stderr)
    sys.exit(1)

lines = src.split("\n")
in_bugsnag = False
depth = 0
out = []
patched = 0

for line in lines:
    if not in_bugsnag:
        # Detect  "<UUID> /* ... Bugsnag ... */ = {"  start line.
        if re.search(r"/\*[^*]*Bugsnag[^*]*\*/", line) and "= {" in line:
            in_bugsnag = True
            depth = line.count("{") - line.count("}")
            out.append(line)
            continue
    else:
        depth += line.count("{") - line.count("}")
        # Replace the shellScript value inside the Bugsnag phase block.
        m = re.match(r'(\s*shellScript = ")[^"]*?(";)', line)
        if m:
            out.append(
                m.group(1)
                + "exit 0 # disabled in CI: no BUGSNAG_API_KEY"
                + m.group(2)
            )
            patched += 1
            if depth <= 0:
                in_bugsnag = False
            continue
        if depth <= 0:
            in_bugsnag = False
    out.append(line)

if patched:
    open(pbxproj, "w").write("\n".join(out))
    print(f"Patched {patched} Bugsnag shellScript(s) in {pbxproj}")
else:
    print("No Bugsnag shellScript found — listing all PBXShellScriptBuildPhase names:")
    for m in re.finditer(
        r"/\* ([^*]+) \*/ = \{[^{]*?isa = PBXShellScriptBuildPhase",
        src,
        re.DOTALL,
    ):
        print(" phase:", m.group(1).strip())
