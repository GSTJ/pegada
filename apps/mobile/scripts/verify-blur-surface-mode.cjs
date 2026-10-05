const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const sourcePath = path.resolve(__dirname, "../src/services/blurSurfaceMode.ts");
const source = fs.readFileSync(sourcePath, "utf8");
const result = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
  fileName: sourcePath,
  reportDiagnostics: true,
});

const errors = (result.diagnostics ?? []).filter(
  (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error,
);
assert.equal(errors.length, 0, "blurSurfaceMode.ts must transpile without diagnostics");

const compiledModule = { exports: {} };
const load = new Function("exports", "module", result.outputText);
load(compiledModule.exports, compiledModule);

const { resolveBlurSurfaceMode } = compiledModule.exports;
assert.equal(typeof resolveBlurSurfaceMode, "function");

const cases = [
  {
    name: "unknown accessibility preference stays opaque",
    input: {
      effectPolicy: "stable",
      liquidGlassAvailable: true,
      reduceTransparencyEnabled: null,
    },
    expected: "opaque",
  },
  {
    name: "Reduce Transparency stays opaque",
    input: {
      effectPolicy: "stable",
      liquidGlassAvailable: true,
      reduceTransparencyEnabled: true,
    },
    expected: "opaque",
  },
  {
    name: "Reduce Transparency outranks opacity-safe policy",
    input: {
      effectPolicy: "opacity-safe",
      liquidGlassAvailable: true,
      reduceTransparencyEnabled: true,
    },
    expected: "opaque",
  },
  {
    name: "opacity-safe policy removes Liquid Glass",
    input: {
      effectPolicy: "opacity-safe",
      liquidGlassAvailable: true,
      reduceTransparencyEnabled: false,
    },
    expected: "flat",
  },
  {
    name: "opacity-safe policy removes legacy blur",
    input: {
      effectPolicy: "opacity-safe",
      liquidGlassAvailable: false,
      reduceTransparencyEnabled: false,
    },
    expected: "flat",
  },
  {
    name: "stable surface uses Liquid Glass",
    input: {
      effectPolicy: "stable",
      liquidGlassAvailable: true,
      reduceTransparencyEnabled: false,
    },
    expected: "glass",
  },
  {
    name: "stable surface uses legacy blur when glass is unavailable",
    input: {
      effectPolicy: "stable",
      liquidGlassAvailable: false,
      reduceTransparencyEnabled: false,
    },
    expected: "legacy",
  },
];

for (const testCase of cases) {
  assert.equal(resolveBlurSurfaceMode(testCase.input), testCase.expected, testCase.name);
}

const readSource = (relativePath) =>
  fs.readFileSync(path.resolve(__dirname, "..", relativePath), "utf8");

const blurViewSource = readSource("src/components/BlurView.tsx");
assert.doesNotMatch(
  blurViewSource,
  /useOptionalIsFocused/,
  "focus changes must not swap blur surface roots",
);
assert.doesNotMatch(
  blurViewSource,
  /import\s+\{[^}]*GlassView[^}]*\}\s+from\s+["']expo-glass-effect["']/,
  "GlassView must not load its native view manager before the safe availability guard",
);
assert.match(
  blurViewSource,
  /require\(["']expo-glass-effect["']\)/,
  "GlassView must load lazily inside the safe availability guard",
);

const glassPillSource = readSource("src/components/MatchActionBar/GlassPillBackground.tsx");
assert.doesNotMatch(
  glassPillSource,
  /from\s+["']expo-glass-effect["']/,
  "action pills must use the same guarded Liquid Glass component",
);

const locationSubmitSource = readSource("src/views/LocationMap/components/Submit/index.tsx");
assert.doesNotMatch(
  locationSubmitSource,
  /opacity-safe|return\s+\{\s*opacity\s*\}/,
  "LocationMap must keep stable glass and use transform-only motion",
);

const authLayoutSource = readSource("src/app/(auth)/_layout.tsx");
assert.match(
  authLayoutSource,
  /headerTransparent:\s*Platform\.OS\s*===\s*["']ios["']/,
  "auth headers must be translucent only where the native iOS blur is supported",
);

const createProfileSource = readSource("src/views/(auth)/CreateProfile/index.tsx");
assert.match(
  createProfileSource,
  /paddingTop:[\s\S]*Platform\.OS\s*===\s*["']ios["'][\s\S]*headerHeight/,
  "CreateProfile must clear its absolutely positioned iOS material header",
);

const completeProfileSource = readSource("src/views/(auth)/CompleteProfile/index.tsx");
assert.match(
  completeProfileSource,
  /paddingTop:\s*Platform\.OS\s*===\s*["']ios["']\s*\?\s*headerHeight\s*:\s*0/,
  "CompleteProfile must clear its absolutely positioned iOS material header",
);

const delayedHeaderHeightSource = readSource("src/hooks/useDelayedHeaderHeight.tsx");
assert.match(
  delayedHeaderHeightSource,
  /getDefaultHeaderHeight[\s\S]*useState\(defaultHeight\)/,
  "transparent auth headers must have a non-zero first-frame content inset",
);

const mainCardSource = readSource("src/components/MainCard/index.tsx");
assert.match(
  mainCardSource,
  /accessibilityElementsHidden[\s\S]*no-hide-descendants/,
  "carousel tap regions must stay behind the single adjustable photo control",
);

const dogProfileGoBackSource = readSource("src/views/DogProfile/components/GoBack/index.tsx");
assert.match(
  dogProfileGoBackSource,
  /blurEffectPolicy[\s\S]*useResolvedBlurSurfaceMode\(blurEffectPolicy\)[\s\S]*<Glassmorphism[\s\S]*blurEffectPolicy=/,
  "the profile back control must expose the shared opacity-safe material policy",
);

const breedTagSource = readSource("src/views/DogProfile/components/BreedTag.tsx");
assert.match(
  breedTagSource,
  /blurEffectPolicy[\s\S]*<GlassmorphismStyled\s+blurEffectPolicy=/,
  "the profile breed chip must expose the shared opacity-safe material policy",
);

process.stdout.write(`Verified ${cases.length} blur policy cases and 12 integration contracts.\n`);
