/**
 * The parity ledger: a machine-checkable proof that a converted module renders
 * the same styles it did before.
 *
 * For every converted definition it computes ground truth by running
 * styled-components' own native pipeline — `InlineStyle.generateStyleObject`,
 * the same call the app makes on every render — over the *pristine* source, for
 * both themes and for every prop combination the classifier identified. It then
 * resolves the emitted Unistyles sheet for the same theme and prop combination
 * (a plain function call plus variant merging; no Unistyles runtime, no native
 * module) and deep-compares the two objects, property by property.
 *
 * Two things this deliberately does NOT do:
 *
 *  - it does not apply `.attrs()` through styled-components. `generateStyleObject`
 *    never sees them; the render path folds attrs into the execution context
 *    first. That folding is replayed here, exactly as the library does it.
 *  - it does not normalise the `transform` array. css-to-react-native emits it
 *    reversed relative to the CSS source, and that reversal is part of what the
 *    app renders today, so it is matched rather than corrected.
 */

import fs from "node:fs";
import path from "node:path";

import { Project } from "ts-morph";

import { collectModule } from "./collect.ts";
import { Loader } from "./evaluate.ts";

export interface DefinitionInfo {
  name: string;
  key: string;
  mode: "inline" | "wrapper";
  /** Variant group → the keys the emitted sheet declares for it. */
  variants: Record<string, string[]>;
  /**
   * Whether the emitted sheet folded a base styled component's declarations in.
   *
   * `styled(Other)` concatenates `Other`'s rules onto its own, so ground truth
   * always contains both. The transform only copies them when `Other` lives in
   * the same module and is being converted alongside; when `Other` is an
   * imported styled component it stays on styled-components and keeps applying
   * its own styles at render time, so the emitted sheet holds only the
   * difference — and the ledger has to compare against the difference too.
   */
  inheritedFrom: string | null;
  /**
   * The props a *dynamic* style function takes, in parameter order.
   *
   * A prop with an unbounded value — a colour handed in from the call site —
   * cannot become a variant, so the sheet entry is a function of it instead.
   * The ledger has to call it before it has an object to compare, and `props`
   * is the only thing it knows about the call sites.
   */
  dynamicArgs?: string[];
  /**
   * Prop combinations to sample, for definitions whose props are not variants.
   * Replaces the generated matrix rather than extending it.
   */
  samples?: Record<string, unknown>[];
}

export interface ParityCheck {
  definition: string;
  theme: string;
  props: string;
  status: "pass" | "fail";
  diffs?: { property: string; expected: unknown; actual: unknown }[];
}

export interface ParityModule {
  file: string;
  status: "checked" | "unverifiable";
  reason?: string;
  checks: ParityCheck[];
}

export interface ParityReport {
  modules: ParityModule[];
  totals: {
    modules: number;
    definitions: number;
    comparisons: number;
    failures: number;
    unverifiable: number;
  };
}

/** Caps the prop matrix; no definition in this app comes close. */
const MAX_COMBOS = 64;

export function checkParity(
  repoRoot: string,
  units: { file: string; definitionsDetail?: DefinitionInfo[] }[],
  pristine: (file: string) => string,
): ParityReport {
  const themes = loadThemes(repoRoot);
  const modules: ParityModule[] = [];

  for (const unit of units) {
    if (!unit.definitionsDetail || unit.definitionsDetail.length === 0) continue;
    modules.push(checkModule(repoRoot, unit.file, unit.definitionsDetail, themes, pristine));
  }

  const checks = modules.flatMap((module) => module.checks);

  return {
    modules,
    totals: {
      modules: modules.length,
      definitions: new Set(
        modules.flatMap((module) => module.checks.map((check) => `${module.file}#${check.definition}`)),
      ).size,
      comparisons: checks.length,
      failures: checks.filter((check) => check.status === "fail").length,
      unverifiable: modules.filter((module) => module.status === "unverifiable").length,
    },
  };
}

function loadThemes(repoRoot: string): Record<string, unknown> {
  const loader = new Loader({ repoRoot });
  const themes = loader.load(
    path.join(repoRoot, "packages", "shared", "themes", "themes.ts"),
  ) as Record<string, unknown>;
  return { light: themes.LightTheme, dark: themes.DarkTheme };
}

function checkModule(
  repoRoot: string,
  file: string,
  definitions: DefinitionInfo[],
  themes: Record<string, unknown>,
  pristine: (file: string) => string,
): ParityModule {
  const absolute = path.join(repoRoot, file);
  const checks: ParityCheck[] = [];

  let before: Record<string, any>;
  let after: Record<string, any>;

  try {
    // Both sides are loaded with their declarations force-exported. The
    // pristine module may keep a styled component module-local, and the emitted
    // one keeps `styles` module-local when nothing outside imports it; neither
    // should put a definition beyond the ledger's reach.
    before = new Loader({
      repoRoot,
      overrides: new Map([[absolute, exportEverything(absolute, pristine(file))]]),
    }).load(absolute);

    after = new Loader({
      repoRoot,
      overrides: new Map([[absolute, exportStyles(absolute, fs.readFileSync(absolute, "utf8"))]]),
    }).load(absolute);
  } catch (error) {
    return {
      file,
      status: "unverifiable",
      reason: `could not evaluate the module: ${(error as Error).message}`,
      checks,
    };
  }

  const sheet = after.styles;
  if (sheet === undefined) {
    return { file, status: "unverifiable", reason: "no `styles` export", checks };
  }

  const byName = new Map(definitions.map((definition) => [definition.name, definition]));

  /**
   * How many of a definition's rules came from a base that is NOT being
   * converted with it. `styled(A)` where `A = styled(Text)` folds A's own
   * declarations in but not Text's, so the walk follows the same-module chain
   * to its foot and measures the first outside base it lands on.
   */
  const inheritedRuleCount = (name: string, seen = new Set<string>()): number => {
    if (seen.has(name)) return 0;
    seen.add(name);

    const info = byName.get(name);
    if (info?.inheritedFrom) return inheritedRuleCount(info.inheritedFrom, seen);
    return before[`${BASE_PREFIX}${name}`]?.inlineStyle?.rules?.length ?? 0;
  };

  for (const definition of definitions) {
    const component = before[definition.name];
    if (!component?.inlineStyle) {
      checks.push({
        definition: definition.name,
        theme: "-",
        props: "-",
        status: "fail",
        diffs: [
          {
            property: "*",
            expected: "a styled component in the pristine module",
            actual: component === undefined ? "undefined" : typeof component,
          },
        ],
      });
      continue;
    }

    for (const [themeName, theme] of Object.entries(themes)) {
      const resolved = typeof sheet === "function" ? sheet(theme) : sheet;
      const entry = resolved?.[definition.key];

      const inheritedRules = inheritedRuleCount(definition.name);

      for (const combo of combos(definition)) {
        const expected = groundTruth(component, theme, combo.props, inheritedRules);
        const actual =
          entry === undefined
            ? undefined
            : applyVariants(callDynamic(entry, definition, combo.props), combo.props);
        const diffs = compare(expected, actual);

        checks.push({
          definition: definition.name,
          theme: themeName,
          props: combo.label,
          status: diffs.length === 0 ? "pass" : "fail",
          ...(diffs.length === 0 ? {} : { diffs }),
        });
      }
    }
  }

  return { file, status: "checked", checks };
}

/* -- ground truth --------------------------------------------------------- */

/**
 * Replays styled-components' render-time work: fold `.attrs()` into the
 * execution context, then ask an InlineStyle for the object.
 *
 * `generateStyleObject` never sees `.attrs()` — the render path folds them into
 * the context first and only then generates — so that folding is done here, in
 * the same order the library does it (later attrs win, and each one can read
 * everything set before it).
 */
function groundTruth(
  component: any,
  theme: unknown,
  props: Record<string, unknown>,
  inheritedRules: number,
): unknown {
  const context: Record<string, unknown> = {
    ...(component.defaultProps ?? {}),
    ...props,
    theme,
  };

  for (const attribute of component.attrs ?? []) {
    const next = typeof attribute === "function" ? attribute(context) : attribute;
    for (const key in next) context[key] = next[key];
  }

  const style = component.inlineStyle;
  if (inheritedRules === 0) return style.generateStyleObject(context);

  // Same class, only this component's own declarations. Reusing the prototype
  // keeps us on the library's code path rather than a re-implementation of it.
  const own = Object.create(Object.getPrototypeOf(style));
  own.rules = style.rules.slice(inheritedRules);
  return own.generateStyleObject(context);
}

/* -- unistyles resolution ------------------------------------------------- */

/**
 * Resolves a dynamic style function against the sampled props. A sheet entry
 * that is a function without `dynamicArgs` is left alone, so it fails the
 * comparison loudly rather than silently comparing against nothing.
 */
function callDynamic(
  entry: unknown,
  definition: DefinitionInfo,
  props: Record<string, unknown>,
): unknown {
  if (typeof entry !== "function" || !definition.dynamicArgs) return entry;
  return (entry as (...args: unknown[]) => unknown)(
    ...definition.dynamicArgs.map((name) => props[name]),
  );
}

/**
 * How Unistyles merges a style: the base object first, then one bucket per
 * variant group. A value with no matching bucket falls through to `default`,
 * which is also what an absent (`undefined`) value selects.
 */
function applyVariants(entry: unknown, props: Record<string, unknown>): unknown {
  if (typeof entry !== "object" || entry === null) return entry;

  const { variants, ...base } = entry as Record<string, any>;
  if (!variants) return base;

  let merged: Record<string, unknown> = { ...base };
  for (const [group, buckets] of Object.entries(variants as Record<string, any>)) {
    const value = props[group];
    const picked = value === undefined ? buckets.default : (buckets[String(value)] ?? buckets.default);
    if (picked) merged = { ...merged, ...picked };
  }

  return merged;
}

/* -- prop matrix ---------------------------------------------------------- */

function combos(definition: DefinitionInfo): { label: string; props: Record<string, unknown> }[] {
  if (definition.samples) {
    return definition.samples.map((props) => ({ label: label(props), props }));
  }

  const groups = Object.entries(definition.variants);
  if (groups.length === 0) return [{ label: "{}", props: {} }];

  let result: Record<string, unknown>[] = [{}];

  for (const [group, keys] of groups) {
    const values = keys.includes("true")
      ? [true, false]
      : [...keys.filter((key) => key !== "default"), undefined];

    result = result.flatMap((partial) => values.map((value) => ({ ...partial, [group]: value })));
    if (result.length > MAX_COMBOS) {
      result = result.slice(0, MAX_COMBOS);
      break;
    }
  }

  return result.map((props) => ({ label: label(props), props }));
}

const label = (props: Record<string, unknown>) =>
  `{ ${Object.entries(props)
    .map(([key, value]) => `${key}: ${value === undefined ? "undefined" : JSON.stringify(value)}`)
    .join(", ")} }`;

/* -- comparison ----------------------------------------------------------- */

function compare(expected: unknown, actual: unknown): ParityCheck["diffs"] {
  const left = (expected ?? {}) as Record<string, unknown>;
  const right = (actual ?? {}) as Record<string, unknown>;
  const diffs: NonNullable<ParityCheck["diffs"]> = [];

  for (const property of new Set([...Object.keys(left), ...Object.keys(right)])) {
    if (!deepEqual(left[property], right[property])) {
      diffs.push({ property, expected: left[property], actual: right[property] });
    }
  }

  return diffs;
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null || typeof a !== "object") return false;

  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    return a.every((item, index) => deepEqual(item, b[index]));
  }

  const left = a as Record<string, unknown>;
  const right = b as Record<string, unknown>;
  const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
  return [...keys].every((key) => deepEqual(left[key], right[key]));
}

/* -- pristine source prep ------------------------------------------------- */

const BASE_PREFIX = "__unistylesLedgerBase_";

/**
 * Prepares the pristine module for sampling: every styled definition is
 * force-exported (module-local ones like `const Title = styled(…)` would
 * otherwise be invisible), and each `styled(Base)` gets its base re-exported
 * under a known name so the ledger can measure how many of the rules were
 * inherited rather than declared here.
 */
function exportEverything(file: string, source: string): string {
  const project = new Project({ useInMemoryFileSystem: true });
  const sourceFile = project.createSourceFile(file, source, { overwrite: true });
  const bases: string[] = [];

  for (const definition of collectModule(sourceFile).definitions) {
    if (!definition.statement.isExported()) definition.statement.setIsExported(true);
    if (definition.base.kind === "component") {
      bases.push(`export const ${BASE_PREFIX}${definition.name} = ${definition.base.expression};`);
    }
  }

  if (bases.length > 0) sourceFile.addStatements(`\n${bases.join("\n")}\n`);
  return sourceFile.getFullText();
}

/** Exposes an emitted `const styles` that the transform kept module-local. */
function exportStyles(file: string, source: string): string {
  const project = new Project({ useInMemoryFileSystem: true });
  const sourceFile = project.createSourceFile(file, source, { overwrite: true });

  for (const statement of sourceFile.getVariableStatements()) {
    const declares = statement.getDeclarations().some((declaration) => declaration.getName() === "styles");
    if (declares && !statement.isExported()) statement.setIsExported(true);
  }

  return sourceFile.getFullText();
}

