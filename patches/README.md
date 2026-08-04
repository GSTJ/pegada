# Bugsnag Patch

Makes it work on monorepos

# Draggable Grid Patch

Fixes typescript errors

# Minimatch Patches (3.1.5 and 9.0.9)

brace-expansion <= 5.0.8 is vulnerable to CVE-2026-14257 and its incomplete
follow-up fix, GHSA-rgw5-rvv9-x895. Both fixes only exist on 5.x.
Both of these minimatch lines are EOL on brace-expansion 1.x/2.x, so the root
override forces the patched 5.x line everywhere and these patches read the named
`expand` export 5.x switched to. Drop them if either minimatch ever ships a
release that depends on brace-expansion 5.
