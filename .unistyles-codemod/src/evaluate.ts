/**
 * A tiny CommonJS loader for app modules, so the parity ledger can *run* the
 * real code instead of reasoning about it.
 *
 * Two things make this possible without a bundler or a simulator:
 *
 *  - TypeScript is transpiled per file (no type checking, no program), and
 *  - anything the styles do not actually depend on is stubbed. A styles module
 *    only ever needs `styled-components/native`, the theme, and the odd helper
 *    like `color`; the components it wraps are never rendered, so a stub
 *    standing in for `PressableArea` is indistinguishable from the real thing
 *    as far as `generateStyleObject` is concerned.
 *
 * `react-native` itself is stubbed too — its published entry point is Flow
 * source that Node cannot parse — which is why styled-components is loaded
 * through this loader rather than a plain `require`: it lets us hand its own
 * `require("react-native")` the stub.
 */

import fs from "node:fs";
import Module from "node:module";
import path from "node:path";

import ts from "typescript";

const require_ = Module.createRequire(import.meta.url);

export interface LoaderOptions {
  repoRoot: string;
  /** Overrides file contents by absolute path — used to load pristine sources. */
  overrides?: Map<string, string>;
}

const SOURCE_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"];
const ASSET = /\.(svg|png|jpe?g|webp|gif|lottie|ttf|otf)$/;

/**
 * Pure packages a stylesheet might actually compute a value with. Everything
 * else is stubbed on principle rather than on failure — a native module often
 * *imports* fine under Node and simply resolves its exports to `undefined`,
 * which surfaces much later as `styled(undefined)`.
 */
const COMPUTES = new Set(["color", "polished", "tinycolor2", "lodash", "date-fns"]);

/** Callable, indexable, and inert — stands in for anything we do not need. */
export function createStub(label: string): any {
  const target: any = function stub() {
    return proxy;
  };
  target.displayName = label;

  // Every hole leads back to the proxy, never to the bare target. Handing out
  // the target for `default` was enough to break `import Animated from
  // "react-native-reanimated"`: `Animated.View` came back `undefined` and
  // surfaced much later as `styled(undefined)`.
  const proxy: any = new Proxy(target, {
    get(holder, property) {
      if (property === "__esModule") return true;
      if (property === "default") return proxy;
      if (property === "toString") return () => label;
      if (typeof property === "symbol") return Reflect.get(holder, property);
      if (!(property in holder)) holder[property] = createStub(`${label}.${String(property)}`);
      return holder[property];
    },
    // styled-components asks `"View" in reactNative` before it will build a
    // component. A lazy `get` is invisible to `in`, so the stub has to claim
    // every string key it is asked about.
    has: (holder, property) => typeof property === "string" || Reflect.has(holder, property),
    apply: () => proxy,
    construct: () => proxy,
  });

  return proxy;
}

/**
 * Enough of react-native for styled-components to boot. `StyleSheet.create` is
 * the identity function in React Native 0.72+, so returning the object as-is is
 * not a simplification — it is what the real one does.
 */
/**
 * styled-components guards `styled.View` with `if (name in ReactNative && …)`,
 * and `in` does not go through a Proxy's `get` trap. The component names have to
 * be real own properties or every `styled.View` in the app throws.
 */
const RN_COMPONENTS = [
  "ActivityIndicator",
  "Button",
  "DrawerLayoutAndroid",
  "FlatList",
  "Image",
  "ImageBackground",
  "KeyboardAvoidingView",
  "Modal",
  "Pressable",
  "RefreshControl",
  "SafeAreaView",
  "ScrollView",
  "SectionList",
  "Switch",
  "Text",
  "TextInput",
  "TouchableHighlight",
  "TouchableOpacity",
  "TouchableWithoutFeedback",
  "View",
  "VirtualizedList",
];

function reactNativeStub(): any {
  const stub = createStub("react-native");
  for (const name of RN_COMPONENTS) stub[name] = createStub(`react-native.${name}`);
  stub.StyleSheet = {
    create: (sheet: Record<string, unknown>) => sheet,
    hairlineWidth: 1,
    absoluteFillObject: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0 },
    flatten: (style: unknown) => style,
  };
  stub.Platform = { OS: "ios", select: (options: Record<string, unknown>) => options.ios };
  stub.PixelRatio = { get: () => 3, getFontScale: () => 1, roundToNearestPixel: (n: number) => n };
  stub.Dimensions = { get: () => ({ width: 390, height: 844, scale: 3, fontScale: 1 }) };
  return stub;
}

export class Loader {
  readonly #repoRoot: string;
  readonly #mobileRoot: string;
  readonly #overrides: Map<string, string>;
  readonly #cache = new Map<string, unknown>();
  readonly #reactNative = reactNativeStub();
  /**
   * Unistyles is a Nitro module and will not load outside an app. Only the
   * shape matters here: `create` hands back exactly what it was given, so a
   * themed sheet stays the `(theme) => ({…})` function the ledger calls itself,
   * and a static one stays a plain object.
   */
  readonly #unistyles = {
    StyleSheet: { create: <T>(sheet: T): T => sheet, configure: () => {} },
    withUnistyles: <T>(component: T) => component,
    // The registration `createUnistylesElement` performs is a native-side
    // concern; for the ledger it is the same identity wrapper as `withUnistyles`.
    createUnistylesElement: <T>(component: T) => component,
    useUnistyles: () => ({ theme: {}, rt: {} }),
    UnistylesRuntime: createStub("UnistylesRuntime"),
  };

  /** The one styled-components instance every module shares, wired to our RN stub. */
  readonly styledComponents: any;

  constructor(options: LoaderOptions) {
    this.#repoRoot = options.repoRoot;
    this.#mobileRoot = path.join(options.repoRoot, "apps", "mobile");
    this.#overrides = options.overrides ?? new Map();
    this.styledComponents = this.#loadStyledComponents();
  }

  /** Loads a module by absolute path and returns its exports. */
  load(file: string): any {
    const cached = this.#cache.get(file);
    if (cached !== undefined) return cached;

    const source = this.#overrides.get(file) ?? fs.readFileSync(file, "utf8");
    const compiled = ts.transpileModule(source, {
      fileName: file,
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.React,
        esModuleInterop: true,
        isolatedModules: true,
      },
    }).outputText;

    const module = { exports: {} as Record<string, unknown> };
    this.#cache.set(file, module.exports);

    const run = new Function(
      "exports",
      "require",
      "module",
      "__filename",
      "__dirname",
      compiled,
    ) as (...args: unknown[]) => void;

    run(
      module.exports,
      (specifier: string) => this.#require(specifier, file),
      module,
      file,
      path.dirname(file),
    );

    this.#cache.set(file, module.exports);
    return module.exports;
  }

  #require(specifier: string, from: string): unknown {
    if (specifier === "styled-components/native" || specifier === "styled-components") {
      return this.styledComponents;
    }
    if (specifier === "react-native" || specifier === "react-native-web") {
      return this.#reactNative;
    }
    if (specifier === "react-native-unistyles") return this.#unistyles;

    const resolved = this.#resolve(specifier, from);
    if (resolved) {
      if (ASSET.test(resolved)) return createStub(specifier);
      if (resolved.endsWith(".json")) return JSON.parse(fs.readFileSync(resolved, "utf8"));
      try {
        return this.load(resolved);
      } catch {
        // A *dependency* that cannot run outside the app (env validation, a
        // native module, a side effect at import) is not a reason to give up on
        // the module under test — its styles almost certainly do not read it.
        // Only a failure in the module being checked is fatal, and that one is
        // raised by the caller, not here.
        this.#cache.set(resolved, createStub(specifier));
        return this.#cache.get(resolved);
      }
    }

    if (specifier.startsWith(".") || specifier.startsWith("@/")) return createStub(specifier);
    if (ASSET.test(specifier)) return createStub(specifier);


    // Allowlist, not try-and-see. Most of this app's dependencies are native
    // modules that half-load under Node and hand back `undefined` exports,
    // which then blow up as `styled(undefined)`. Only packages a stylesheet
    // could plausibly *compute* with are worth loading for real.
    if (COMPUTES.has(specifier.split("/")[0]!)) {
      try {
        return require_(specifier);
      } catch {
        return createStub(specifier);
      }
    }

    return createStub(specifier);
  }

  #resolve(specifier: string, from: string): string | null {
    const base = specifier.startsWith("@/")
      ? path.join(this.#mobileRoot, "src", specifier.slice(2))
      : specifier.startsWith("@pegada/shared/")
        ? path.join(this.#repoRoot, "packages", "shared", specifier.slice("@pegada/shared/".length))
        : specifier.startsWith(".")
          ? path.resolve(path.dirname(from), specifier)
          : null;
    if (!base) return null;

    const candidates = [
      base,
      ...SOURCE_EXTENSIONS.map((extension) => base + extension),
      ...SOURCE_EXTENSIONS.map((extension) => path.join(base, `index${extension}`)),
    ];

    for (const candidate of candidates) {
      if (this.#overrides.has(candidate)) return candidate;
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
    }
    return null;
  }

  /**
   * styled-components' native build is evaluated through this loader rather
   * than `require`d, purely so its `require("react-native")` lands on the stub.
   */
  #loadStyledComponents(): any {
    const entry = require_.resolve("styled-components/native/dist/styled-components.native.cjs.js");
    const compiled = fs.readFileSync(entry, "utf8");
    const module = { exports: {} as Record<string, unknown> };
    const scoped = Module.createRequire(entry);

    const run = new Function("exports", "require", "module", "__filename", "__dirname", compiled) as (
      ...args: unknown[]
    ) => void;

    run(
      module.exports,
      (specifier: string) =>
        specifier === "react-native" ? this.#reactNative : scoped(specifier),
      module,
      entry,
      path.dirname(entry),
    );

    return module.exports;
  }
}
