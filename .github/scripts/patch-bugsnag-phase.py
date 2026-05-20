"""
.pbxproj patcher: find the PBXShellScriptBuildPhase whose name field contains
'Bugsnag' and replace its shellScript value with 'exit 0 # disabled in CI'.

Strategy:
  1. Find the PBXShellScriptBuildPhase section via text markers.
  2. For each phase block UUID, extract the block via brace counting.
  3. Identify Bugsnag blocks by checking for 'Bugsnag' in block content.
  4. Replace the shellScript line in the Bugsnag block by splitting into
     lines and replacing the line that starts with 'shellScript = "'.
     This is line-level, so embedded quotes don't matter.

Usage:
    PBXPROJ=path/to/project.pbxproj python3 patch-bugsnag-phase.py
"""
import re
import sys
import os

print("patch-bugsnag-phase.py: starting", flush=True)

pbxproj = os.environ.get("PBXPROJ", "")
if not pbxproj:
    print("ERROR: PBXPROJ environment variable is not set", file=sys.stderr)
    sys.exit(1)

print(f"Reading: {pbxproj}", flush=True)
try:
    src = open(pbxproj, encoding="utf-8", errors="replace").read()
except OSError as exc:
    print(f"ERROR: cannot read {pbxproj}: {exc}", file=sys.stderr)
    sys.exit(1)

print(f"File size: {len(src)} bytes", flush=True)

# ── Locate the PBXShellScriptBuildPhase section ───────────────────────────────
SECTION_BEGIN = "/* Begin PBXShellScriptBuildPhase section */"
SECTION_END   = "/* End PBXShellScriptBuildPhase section */"

begin_pos = src.find(SECTION_BEGIN)
end_pos   = src.find(SECTION_END)

if begin_pos != -1 and end_pos != -1:
    section_text = src[begin_pos : end_pos + len(SECTION_END)]
    print(f"PBXShellScriptBuildPhase section found ({len(section_text)} bytes).", flush=True)
else:
    print("WARNING: PBXShellScriptBuildPhase section markers not found. Scanning full file.", flush=True)
    section_text = src

# ── For each phase UUID in the section, extract block and check for Bugsnag ───
# UUID lines look like: \t\tXXXXXXXXXXXXXXXXXXXXXXXX /* ... */ = {
uuid_line_re = re.compile(r'\t\t([0-9A-Fa-f]{24}) /\* ([^*]+) \*/ = \{')

patched = 0
new_src_chars = list(src)  # Mutable character list for in-place patching.

for m in uuid_line_re.finditer(section_text):
    uuid = m.group(1)
    comment = m.group(2).strip()

    # Find the same line in the full source (new_src_chars built from src).
    # We search for the UUID to locate the block start precisely.
    line_start_in_src = src.find(m.group(0))
    if line_start_in_src == -1:
        print(f"  UUID {uuid} not found in full source. Skipping.", flush=True)
        continue

    # Scan to find the matching closing "};".
    # Start at the '{' in "= {" at the end of the match.
    scan_pos = line_start_in_src + len(m.group(0)) - 1  # points at '{'
    depth = 1
    pos = scan_pos + 1
    while pos < len(src) and depth > 0:
        if src[pos] == '{':
            depth += 1
        elif src[pos] == '}':
            depth -= 1
        pos += 1
    block_end_pos = pos  # Just after the closing '}'.

    block_content = src[line_start_in_src:block_end_pos]

    # Only care about PBXShellScriptBuildPhase blocks.
    if 'isa = PBXShellScriptBuildPhase' not in block_content:
        continue

    # Check for Bugsnag (in name, comment, or anywhere).
    if 'Bugsnag' not in block_content:
        nm = re.search(r'\s*name = "([^"]+)"', block_content)
        print(f"  Phase {comment!r}: no Bugsnag mention. Skipping.", flush=True)
        continue

    nm = re.search(r'\s*name = "([^"]+)"', block_content)
    phase_name = nm.group(1) if nm else comment
    print(f"Found Bugsnag phase: {phase_name!r}", flush=True)

    # Patch the shellScript line inside this block.
    # Split block into lines and find the shellScript line.
    block_lines = block_content.split("\n")
    block_patched = False
    new_block_lines = []
    for bl in block_lines:
        stripped = bl.strip()
        if stripped.startswith('shellScript = "'):
            # Replace the ENTIRE line with the exit-0 script.
            indent = bl[: len(bl) - len(bl.lstrip())]
            new_bl = indent + 'shellScript = "exit 0 # disabled in CI: no BUGSNAG_API_KEY";'
            new_block_lines.append(new_bl)
            block_patched = True
            print(f"  Replaced shellScript line.", flush=True)
        else:
            new_block_lines.append(bl)

    if block_patched:
        new_block_content = "\n".join(new_block_lines)
        # Replace the original block in new_src_chars.
        # We operate on the ORIGINAL src positions (not the mutable list)
        # because we only patch one block.
        new_src = (
            src[:line_start_in_src]
            + new_block_content
            + src[block_end_pos:]
        )
        # Update src for subsequent block searches (in case of multiple Bugsnag blocks).
        src = new_src
        patched += 1
    else:
        print(f"  WARNING: shellScript line not found in Bugsnag block.", flush=True)
        print(f"  Block:\n{block_content[:500]}", flush=True)

if patched:
    open(pbxproj, "w", encoding="utf-8").write(src)
    print(f"Wrote patched pbxproj ({len(src)} bytes, {patched} patch(es)).", flush=True)
else:
    print("No Bugsnag phase was patched.", flush=True)
    print("All PBXShellScriptBuildPhase blocks (by UUID) found in section:", flush=True)
    for m in uuid_line_re.finditer(section_text):
        line_start = src.find(m.group(0)) if 'src' in dir() else -1
        print(f"  UUID={m.group(1)} comment={m.group(2).strip()!r}", flush=True)
