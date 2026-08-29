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

Two unrelated things, one file because pnpm patches a package, not a defect.

## 1. A shadow-tree commit that frees nodes React already destroyed

Selecting a theme deep into a session aborted the process:

    EXC_CRASH (SIGABRT)
    ___BUG_IN_CLIENT_OF_LIBMALLOC_POINTER_BEING_FREED_WAS_NOT_ALLOCATED
    std::unique_ptr<folly::dynamic>::operator=
    margelo::nitro::unistyles::shadow::ShadowTreeManager::updateShadowTree
    HybridStyleSheet::applyDependencyChanges
    HybridStyleSheet::onPlatformDependenciesChange

`ShadowTrafficController` keys its pending updates on raw
`const ShadowNodeFamily*`, and `updateShadowTree` writes through every one of
them — `const_cast`, then assign `nativeProps_DEPRECATED`, which frees whatever
`unique_ptr` it finds at that address. Two things let a key outlive its family:

* Nothing drains the map. `getUpdates()` handed out a reference and only
  `restore()` empties it — and `restore()` has no callers anywhere in the
  package. A family that received one update stayed a key for the rest of the
  process, and every later commit walked it again.
* Not every unmount reaches `unlink`. `ShadowRegistry.remove` routes a node
  unmounting inside a suspended boundary to `suspend` instead, and this app
  puts every screen under a `Suspense` (`NetworkBoundary`, `useSuspenseQuery`).
  A subtree deleted while its boundary was showing a fallback never reported
  its death at all.

So the map accumulates addresses of families Fabric has freed, and the first
theme change after enough of them writes through one. A short session has too
few; the crash needs a long one, which is why it only ever showed up in the
grand journey.

The patch drains the map on commit, skips families the registry no longer
tracks or has parked in suspension, and drops a suspended family's pending
update at the moment it suspends. It is upstream PR #1191, which fixes issue
[#1179](https://github.com/jpudysz/react-native-unistyles/issues/1179) and is
closed unmerged for want of a reproduction. Drop it when a release carries it.

## 2. A transform-origin parser that only exists on react-native's main

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
