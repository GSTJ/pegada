# Bugsnag Patch

Makes it work on monorepos

# Draggable Grid Patch

Fixes typescript errors

# image-size Patch (1.2.1)

Rejects zero-length ICNS and ISO-BMFF entries so malformed ICNS, JXL and HEIF
images cannot trap Metro's parser in an infinite loop. Drop it once Metro moves
to an image-size release that contains the upstream fix.

# Minimatch Patches (3.1.5 and 9.0.9)

brace-expansion <= 5.0.8 is vulnerable to CVE-2026-14257 and its incomplete
follow-up fix, GHSA-rgw5-rvv9-x895. Both fixes only exist on 5.x.
Both of these minimatch lines are EOL on brace-expansion 1.x/2.x, so the root
override forces the patched 5.x line everywhere and these patches read the named
`expand` export 5.x switched to. Drop them if either minimatch ever ships a
release that depends on brace-expansion 5.

# react-native-unistyles Patch (3.3.0)

`cxx/converters/TransformOriginConverter.cpp` calls
`facebook::react::parseUnprocessedTransformOriginString`, which exists only on
react-native's `main` branch. No published release declares it, including the
0.83.6 this repo pins, and the `__has_include` guard around the call cannot
see that: the header is there, the function is not. So the guard passes and
`:app:assembleRelease` fails to compile. It is Android-only because
`RN_SERIALIZABLE_STATE` is defined solely by unistyles' own Android
autolinking cmake; iOS already compiles the fallback.

The patch adds a react-native version gate next to the header probe, so the
parser is compiled only on a release new enough to have the symbol. Below that,
Android takes the same `return std::nullopt` iOS ships today, which leaves a
string `transformOrigin` unparsed on both platforms. Drop the patch once
react-native ships the function and unistyles gates it on a version rather than
on a header.
