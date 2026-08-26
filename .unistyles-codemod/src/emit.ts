/**
 * Renders the intermediate style shape as the `StyleSheet.create` call that
 * replaces a module's styled definitions. Output is deliberately plain — oxfmt
 * runs after the codemod and owns the final formatting.
 */

import type { StyleIR, VariantGroups } from "./classify.ts";
import type { StyleEntry } from "./css.ts";

export interface EmittableDefinition {
  key: string;
  ir: StyleIR;
  definition: { name: string };
}

export function emitStyleSheet(
  definitions: EmittableDefinition[],
  styleSheetName: string,
  /** False when the module renders its own components and nobody imports them. */
  exported: boolean,
): string {
  const usesTheme = definitions.some((item) => item.ir.usesTheme);
  const colors = new Hoist();

  const body = definitions
    .map((item) => `  ${propertyKey(item.key)}: ${renderStyle(item.ir, 1, item.key, colors)},`)
    .join("\n");

  const object = `{\n${body}\n}`;

  const keyword = exported ? "export const" : "const";
  const sheet = usesTheme
    ? `${keyword} styles = ${styleSheetName}.create((theme) => (${object}));\n`
    : `${keyword} styles = ${styleSheetName}.create(${object});\n`;

  return colors.declarations() + sheet;
}

/**
 * Hard-coded colours get a name on the way out. `react-native/no-color-literals`
 * only sees literals written inline in a stylesheet, and a template that said
 * `background-color: #fffacb` was invisible to it before; a named constant keeps
 * the exact value without landing the migration with a new lint error.
 */
class Hoist {
  readonly #byValue = new Map<string, string>();
  readonly #used = new Set<string>();

  name(value: string, styleKey: string, property: string): string {
    const existing = this.#byValue.get(value);
    if (existing) return existing;

    const base = screamingSnake(`${styleKey} ${property}`);
    let name = base;
    let suffix = 2;
    while (this.#used.has(name)) name = `${base}_${suffix++}`;

    this.#used.add(name);
    this.#byValue.set(value, name);
    return name;
  }

  declarations(): string {
    if (this.#byValue.size === 0) return "";
    return `${[...this.#byValue]
      .map(([value, name]) => `const ${name} = ${value};`)
      .join("\n")}\n\n`;
  }
}

const COLOR = /^"(#[0-9a-fA-F]{3,8}|(?:rgb|rgba|hsl|hsla)\(.*\))"$/;

const screamingSnake = (text: string) =>
  text
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .trim()
    .replace(/[^A-Za-z0-9]+/g, "_")
    .toUpperCase();

function renderStyle(ir: StyleIR, depth: number, styleKey: string, colors: Hoist): string {
  const pad = "  ".repeat(depth + 1);
  const lines = ir.base.map(
    ([key, source]) => `${pad}${propertyKey(key)}: ${value(source, styleKey, key, colors)},`,
  );

  if (ir.variants.size > 0) {
    lines.push(`${pad}variants: ${renderVariants(ir.variants, depth + 1, styleKey, colors)},`);
  }

  if (lines.length === 0) return "{}";
  return `{\n${lines.join("\n")}\n${"  ".repeat(depth)}}`;
}

const value = (source: string, styleKey: string, property: string, colors: Hoist) =>
  COLOR.test(source) ? colors.name(source, styleKey, property) : source;

function renderVariants(
  variants: VariantGroups,
  depth: number,
  styleKey: string,
  colors: Hoist,
): string {
  const pad = "  ".repeat(depth + 1);

  const groups = [...variants].map(([group, keys]) => {
    const inner = [...keys]
      .map(
        ([key, entries]) =>
          `${pad}  ${propertyKey(key)}: ${renderEntries(entries, depth + 2, styleKey, colors)},`,
      )
      .join("\n");
    return `${pad}${propertyKey(group)}: {\n${inner}\n${pad}},`;
  });

  return `{\n${groups.join("\n")}\n${"  ".repeat(depth)}}`;
}

function renderEntries(
  entries: StyleEntry[],
  depth: number,
  styleKey: string,
  colors: Hoist,
): string {
  if (entries.length === 0) return "{}";
  const pad = "  ".repeat(depth + 1);
  const body = entries
    .map(([key, source]) => `${pad}${propertyKey(key)}: ${value(source, styleKey, key, colors)},`)
    .join("\n");
  return `{\n${body}\n${"  ".repeat(depth)}}`;
}

const IDENTIFIER = /^[A-Za-z_$][\w$]*$/;

const propertyKey = (key: string) => (IDENTIFIER.test(key) ? key : JSON.stringify(key));
