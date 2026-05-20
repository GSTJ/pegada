"""
.pbxproj patcher: find the PBXShellScriptBuildPhase whose name field contains
'Bugsnag' and replace its shellScript value with 'exit 0 # disabled in CI'.

Three strategies (tried in order):
  A. Section-based parser — scan inside the PBXShellScriptBuildPhase section
     using a name-field check (most reliable, doesn't depend on UUID comments).
  B. DOTALL comment regex — match the UUID comment that contains 'Bugsnag'
     then crawl forward to shellScript (handles standard pbxproj format).
  C. Per-block name search — find any block where name contains 'Bugsnag'
     and replace the shellScript within that block extent.

Usage:
    PBXPROJ=path/to/project.pbxproj python3 patch-bugsnag-phase.py
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

REPLACEMENT = r'\1exit 0 # disabled in CI: no BUGSNAG_API_KEY\2'
shell_re = re.compile(r'(shellScript = ")[^"]*(")')


def patch_block(block_text):
    """Replace shellScript value in a single block text. Returns (new_text, changed)."""
    new_text, n = shell_re.subn(
        lambda m: m.group(1) + "exit 0 # disabled in CI: no BUGSNAG_API_KEY" + m.group(2),
        block_text,
    )
    return new_text, n > 0


def write_and_exit(new_src, strategy, count):
    open(pbxproj, "w").write(new_src)
    print(f"Patched {count} Bugsnag shellScript(s) via {strategy}")
    sys.exit(0)


# ── Strategy A: PBXShellScriptBuildPhase section parser ──────────────────────
section_re = re.compile(
    r"(/\* Begin PBXShellScriptBuildPhase section \*/)(.*?)(/\* End PBXShellScriptBuildPhase section \*/)",
    re.DOTALL,
)
sm = section_re.search(src)
if sm:
    section_content = sm.group(2)
    # Each block: from "UUID /* ... */ = {" to the matching closing "};".
    # We track brace depth to find the end of each block.
    lines = section_content.split("\n")
    # Collect blocks as (start_idx, end_idx) in lines list.
    blocks = []
    i = 0
    while i < len(lines):
        line = lines[i]
        # Block start: any line with "= {" that looks like a pbxproj object entry.
        if "= {" in line and (line.strip().startswith("/*") or re.match(r"\s*\w", line)):
            depth = line.count("{") - line.count("}")
            start = i
            j = i + 1
            while j < len(lines) and depth > 0:
                depth += lines[j].count("{") - lines[j].count("}")
                j += 1
            blocks.append((start, j))
            i = j
        else:
            i += 1

    patched = 0
    new_lines = list(lines)
    for start, end in blocks:
        block_text = "\n".join(lines[start:end])
        if re.search(r'name\s*=\s*"[^"]*Bugsnag[^"]*"', block_text):
            print(f"Strategy A: found Bugsnag block at line {start}")
            new_block, changed = patch_block(block_text)
            if changed:
                new_lines[start:end] = new_block.split("\n")
                patched += 1
            else:
                print("  WARNING: shellScript not found inside Bugsnag block")

    if patched:
        new_section_content = "\n".join(new_lines)
        new_src = src.replace(
            sm.group(0),
            sm.group(1) + new_section_content + sm.group(3),
            1,
        )
        write_and_exit(new_src, "Strategy A (section parser)", patched)
    else:
        print("Strategy A: section found but no Bugsnag name in any block.")
        # Fall through to Strategy B.
else:
    print("Strategy A: section markers not found, trying Strategy B.")

# ── Strategy B: UUID-comment DOTALL regex ────────────────────────────────────
# Matches: /* ... Bugsnag ... */ = { ... shellScript = "..."; ...
# Using .*? (lazy, DOTALL) to traverse nested braces to reach shellScript.
phase_re = re.compile(
    r"(/\*[^*]*Bugsnag[^*]*\*/[^{]*=\s*\{.*?shellScript\s*=\s*\")([^\"]*)(\";)",
    re.DOTALL,
)
new_src, n = phase_re.subn(
    r"\1exit 0 # disabled in CI: no BUGSNAG_API_KEY\3", src
)
if n:
    write_and_exit(new_src, "Strategy B (DOTALL comment regex)", n)
else:
    print("Strategy B: no match. Trying Strategy C.")

# ── Strategy C: name-field block search ──────────────────────────────────────
# Find any block containing name = "... Bugsnag ..." and patch its shellScript.
# We do this on the whole file (no section markers required).
name_block_re = re.compile(
    r"((?:[A-F0-9a-f]{24}|\S+)\s+/\*[^*]+\*/\s*=\s*\{)"  # UUID block opener
    r"((?:[^{}]|\{[^{}]*\})*?)"  # block body (single nesting level)
    r"(\};)",
    re.DOTALL,
)
patched = 0
new_src = src
for bm in name_block_re.finditer(src):
    body = bm.group(2)
    if re.search(r'name\s*=\s*"[^"]*Bugsnag[^"]*"', body):
        print(f"Strategy C: found Bugsnag block.")
        new_body, changed = patch_block(body)
        if changed:
            new_src = new_src.replace(
                bm.group(0), bm.group(1) + new_body + bm.group(3), 1
            )
            patched += 1

if patched:
    write_and_exit(new_src, "Strategy C (name-field block search)", patched)

# ── All strategies failed ─────────────────────────────────────────────────────
print("All strategies failed. Listing all PBXShellScriptBuildPhase names for debugging:")
for m in re.finditer(
    r"/\* ([^*]+) \*/ = \{[^{]*?isa = PBXShellScriptBuildPhase",
    src,
    re.DOTALL,
):
    print(f"  phase: {m.group(1).strip()!r}")
# Also try name field search.
for m in re.finditer(r'isa = PBXShellScriptBuildPhase[^}]*?name = "([^"]+)"', src, re.DOTALL):
    print(f"  name field: {m.group(1)!r}")
