/**
 * CSS-template → React Native style object.
 *
 * Parity is not re-implemented here, it is borrowed: every declaration goes
 * through `css-to-react-native`, the exact library styled-components uses to
 * turn its templates into RN styles. Same input, same key expansion
 * (`flex: 1` → flexGrow/flexShrink/flexBasis, `margin: a b` → four longhands,
 * `shadow-offset` → `{width, height}`), same edge cases.
 *
 * Interpolations are handled by *sentinel substitution*: each `${expr}` is
 * replaced with an opaque-but-parseable token, the declaration is run through
 * the real parser, and the token is swapped for the expression's source in the
 * result. That way an interpolated declaration lands on exactly the keys the
 * equivalent static one would, including shorthands.
 */

import cssToRN from "css-to-react-native";

const transform = (cssToRN as { default?: unknown }).default ?? cssToRN;
const cssTransform = transform as (
  tuples: [string, string][],
  shorthandBlacklist?: string[],
) => Record<string, unknown>;

/**
 * styled-components' native renderer calls the parser as
 * `transform(decls, ["borderWidth", "borderColor"])` — those two keep their
 * shorthand form instead of expanding into four sides. Matching it is not
 * cosmetic: it is what makes the emitted object byte-identical to what the app
 * renders today, which is what the parity ledger checks.
 */
const SHORTHAND_BLACKLIST = ["borderWidth", "borderColor"];

export type Segment = { type: "text"; value: string } | { type: "expr"; index: number };

export type TemplateNode =
  /** `padding: ${x}px` */
  | { kind: "decl"; property: string; value: Segment[] }
  /** A bare `${...}` sitting where a declaration would go. */
  | { kind: "block"; index: number }
  /** Something the parser could not make sense of. */
  | { kind: "unparsed"; text: string };

/* -- template splitting --------------------------------------------------- */

// styled-components runs templates through stylis, which understands both CSS
// block comments and `//` line comments.
const stripComments = (text: string) =>
  text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

/**
 * Interleaves quasis and expression indices into declaration-level nodes.
 *
 * Declarations split on `;`, but a bare `${…}` block is self-delimiting —
 * styled-components lets you stack two conditional blocks with nothing but a
 * blank line between them, and neither needs a semicolon. React Native's
 * styled-components has no nested selectors or at-rules, so that is the whole
 * grammar.
 */
export function parseTemplate(quasis: string[]): TemplateNode[] {
  const nodes: TemplateNode[] = [];
  const stripped = quasis.map(stripComments);
  let current: Segment[] = [];

  const flush = () => {
    const node = finalize(current);
    if (node) nodes.push(node);
    current = [];
  };

  stripped.forEach((quasi, index) => {
    if (index > 0) {
      const standalone = isBlank(current) && /^\s*(;|$)/.test(stripped[index]!);
      current.push({ type: "expr", index: index - 1 });
      if (standalone) flush();
    }

    const pieces = quasi.split(";");
    pieces.forEach((piece, pieceIndex) => {
      current.push({ type: "text", value: piece });
      if (pieceIndex < pieces.length - 1) flush();
    });
  });

  flush();
  return nodes;
}

const isBlank = (segments: Segment[]) =>
  segments.every((segment) => segment.type === "text" && segment.value.trim() === "");

function finalize(segments: Segment[]): TemplateNode | null {
  const trimmed = trimEdges(segments);
  if (trimmed.length === 0) return null;

  const meaningful = trimmed.filter(
    (segment) => segment.type === "expr" || segment.value.trim() !== "",
  );
  if (meaningful.length === 0) return null;

  if (meaningful.length === 1 && meaningful[0]!.type === "expr") {
    return { kind: "block", index: meaningful[0].index };
  }

  const head = trimmed[0];
  if (head?.type !== "text" || !head.value.includes(":")) {
    return { kind: "unparsed", text: describe(trimmed) };
  }

  const colon = head.value.indexOf(":");
  const property = head.value.slice(0, colon).trim();
  const rest = head.value.slice(colon + 1);

  if (!/^[a-zA-Z-]+$/.test(property)) return { kind: "unparsed", text: describe(trimmed) };

  const value = trimEdges([{ type: "text", value: rest }, ...trimmed.slice(1)]);
  if (value.length === 0) return { kind: "unparsed", text: describe(trimmed) };

  return { kind: "decl", property, value };
}

function trimEdges(segments: Segment[]): Segment[] {
  const copy = segments.slice();

  while (copy.length > 0) {
    const first = copy[0]!;
    if (first.type !== "text") break;
    const value = first.value.replace(/^\s+/, "");
    if (value === "") copy.shift();
    else {
      copy[0] = { type: "text", value };
      break;
    }
  }

  while (copy.length > 0) {
    const last = copy[copy.length - 1]!;
    if (last.type !== "text") break;
    const value = last.value.replace(/\s+$/, "");
    if (value === "") copy.pop();
    else {
      copy[copy.length - 1] = { type: "text", value };
      break;
    }
  }

  return copy;
}

const describe = (segments: Segment[]) =>
  segments
    .map((segment) => (segment.type === "text" ? segment.value : `\${…}`))
    .join("")
    .trim();

/* -- declaration → style entries ------------------------------------------ */

export type StyleEntry = [key: string, source: string];

const NUMERIC_SENTINEL = 987650000;
const numericSentinel = (index: number) => String(NUMERIC_SENTINEL + index);
const stringSentinel = (index: number) => `__uni_expr_${index}__`;
// Six valid hex digits, so the color parser accepts it and echoes it back.
const colorSentinel = (index: number) => `#fe${String(index).padStart(4, "0")}`;

const SENTINELS = [numericSentinel, stringSentinel, colorSentinel];

export class CssError extends Error {}

/**
 * Converts one declaration into the RN style entries it produces, with each
 * `${expr}` replaced by `sources[index]` — a raw JS expression string.
 */
export function declarationToEntries(
  property: string,
  value: Segment[],
  sources: Map<number, string>,
): StyleEntry[] {
  const indices = value.flatMap((segment) => (segment.type === "expr" ? [segment.index] : []));

  if (indices.length === 0) {
    return entriesFrom(runTransform(property, renderValue(value, () => "")), new Map());
  }

  let lastError: unknown;
  for (const sentinel of SENTINELS) {
    const rendered = renderValue(value, sentinel);
    try {
      const result = runTransform(property, rendered);
      const swaps = new Map<string, string>();
      for (const index of indices) {
        const source = sources.get(index);
        if (source === undefined) throw new CssError(`no source for interpolation ${index}`);
        // The parser may hand a numeric sentinel back as a number or as a
        // string, depending on the property; both spellings map to the source.
        swaps.set(sentinel(index), source);
      }
      return entriesFrom(result, swaps);
    } catch (error) {
      lastError = error;
    }
  }

  throw new CssError(
    `cannot convert "${property}: ${describe(value)}" (${(lastError as Error)?.message ?? "unknown"})`,
  );
}

const renderValue = (value: Segment[], sentinel: (index: number) => string) =>
  value
    .map((segment) => (segment.type === "text" ? segment.value : sentinel(segment.index)))
    .join("")
    .replace(/\s+/g, " ")
    .trim();

function runTransform(property: string, value: string): Record<string, unknown> {
  // css-to-react-native warns for unitless mismatches while still returning the
  // right shape; sentinel probing makes those warnings expected noise.
  const error = console.error;
  const warn = console.warn;
  const log = console.log;
  console.error = console.warn = console.log = () => {};
  try {
    return cssTransform([[property, value]], SHORTHAND_BLACKLIST);
  } finally {
    console.error = error;
    console.warn = warn;
    console.log = log;
  }
}

function entriesFrom(result: Record<string, unknown>, swaps: Map<string, string>): StyleEntry[] {
  return Object.entries(result).map(([key, value]) => [key, serialize(key, value, swaps)]);
}

/**
 * Renders a parser result back to JS source. A sentinel only survives as an
 * *entire* value; if the parser folded one into a longer string there is no
 * faithful way to rebuild it, so that declaration is rejected instead of
 * silently mangled.
 */
function serialize(key: string, value: unknown, swaps: Map<string, string>): string {
  if (typeof value === "number" || typeof value === "string") {
    const replacement = swaps.get(String(value));
    if (replacement !== undefined) return replacement;

    // `top: -${SIZE / 2}px` puts the minus sign outside the interpolation, so
    // the parser returns the negated sentinel. Dropping it here is how the
    // sign silently disappeared before the parity ledger caught it.
    if (typeof value === "number" && value < 0) {
      const negated = swaps.get(String(-value));
      if (negated !== undefined) return `-(${negated})`;
    }

    if (typeof value === "string") {
      for (const token of swaps.keys()) {
        if (value.includes(token)) {
          throw new CssError(`interpolation was folded into "${key}: ${value}"`);
        }
      }
    }
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => serialize(key, item, swaps)).join(", ")}]`;
  }

  if (value && typeof value === "object") {
    const body = Object.entries(value)
      .map(([name, item]) => `${name}: ${serialize(key, item, swaps)}`)
      .join(", ");
    return `{ ${body} }`;
  }

  return JSON.stringify(value);
}
