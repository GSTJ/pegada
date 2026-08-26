/**
 * Turns a collected `styled…` definition into the intermediate style shape the
 * emitter writes out, or into a reason why it cannot be converted safely.
 *
 * The rule throughout: when in doubt, refuse. A skipped file keeps working on
 * styled-components (both systems coexist during the migration), so a wrong
 * conversion costs far more than a missed one.
 */

import type { CssFragment, StyledDefinition } from "./collect.ts";

import { Node, SyntaxKind, type Expression } from "ts-morph";

import {
  CssError,
  declarationToEntries,
  parseTemplate,
  type Segment,
  type StyleEntry,
} from "./css.ts";

export type VariantGroups = Map<string, Map<string, StyleEntry[]>>;

export interface StyleIR {
  base: StyleEntry[];
  variants: VariantGroups;
  usesTheme: boolean;
  /** Every key we wrote, in source order, so we can catch inverted overrides. */
  trace: { key: string; where: "base" | "variant" }[];
}

export class UnsupportedError extends Error {}

export interface ClassifyContext {
  /** css`` fragments declared in the same module, by name. */
  fragments: Map<string, CssFragment>;
  /** Style IRs of same-module definitions a `styled(Local)` can inherit from. */
  locals: Map<string, StyleIR>;
  /** Resolves a `${importedFragment}` to the css`` it was declared with. */
  resolveFragment?: (name: string) => Pick<CssFragment, "quasis" | "interpolations"> | null;
}

export function classifyDefinition(
  definition: StyledDefinition,
  context: ClassifyContext,
): StyleIR {
  const inherited =
    definition.base.kind === "component"
      ? context.locals.get(definition.base.expression)
      : undefined;

  const ir: StyleIR = {
    base: inherited ? inherited.base.slice() : [],
    variants: inherited ? cloneVariants(inherited.variants) : new Map(),
    usesTheme: inherited?.usesTheme ?? false,
    trace: inherited ? inherited.trace.slice() : [],
  };

  convertTemplate(definition.quasis, definition.interpolations, ir, context);
  assertNoLateOverride(ir);
  mirrorBooleanFallback(ir);
  ir.base = dedupeKeepingLast(ir.base);
  return ir;
}

const emptyIR = (): StyleIR => ({
  base: [],
  variants: new Map(),
  usesTheme: false,
  trace: [],
});

/** Later declarations win, exactly as they do in a CSS block. */
function dedupeKeepingLast(entries: StyleEntry[]): StyleEntry[] {
  const byKey = new Map<string, string>();
  for (const [key, source] of entries) byKey.set(key, source);
  return [...byKey];
}

/* -- template walking ----------------------------------------------------- */

function convertTemplate(
  quasis: string[],
  interpolations: Expression[],
  ir: StyleIR,
  context: ClassifyContext,
  /**
   * The parameter of the arrow that produced this template, if any. A nested
   * css`` fragment writes `${props.theme.x}` bare — it closes over the outer
   * arrow rather than declaring its own — so that binding has to travel down.
   */
  scope: Parameter | null = null,
): void {
  for (const node of parseTemplate(quasis)) {
    if (node.kind === "unparsed") {
      throw new UnsupportedError(`could not parse \`${node.text}\``);
    }

    if (node.kind === "decl") {
      convertDeclaration(node.property, node.value, interpolations, ir, scope);
      continue;
    }

    convertBlock(interpolations[node.index]!, ir, context, scope);
  }
}

function convertDeclaration(
  property: string,
  segments: Segment[],
  interpolations: Expression[],
  ir: StyleIR,
  scope: Parameter | null,
): void {
  const indices = segments.flatMap((segment) => (segment.type === "expr" ? [segment.index] : []));

  const sources = new Map<number, string>();
  let branching: { group: string; branches: [string, string][]; index: number } | null = null;

  for (const index of indices) {
    const expression = interpolations[index]!;
    const classified = classifyValue(expression, scope);

    if (classified.kind === "value") {
      sources.set(index, classified.source);
      ir.usesTheme ||= classified.usesTheme;
      continue;
    }

    if (branching) {
      throw new UnsupportedError(
        `\`${property}\` mixes two prop-dependent interpolations in one declaration`,
      );
    }

    branching = { group: classified.group, branches: classified.branches, index };
    ir.usesTheme ||= classified.usesTheme;
  }

  const run = (extra?: [number, string]): StyleEntry[] => {
    const merged = new Map(sources);
    if (extra) merged.set(extra[0], extra[1]);
    try {
      return declarationToEntries(property, segments, merged);
    } catch (error) {
      if (error instanceof CssError) throw new UnsupportedError(error.message);
      throw error;
    }
  };

  if (!branching) {
    const entries = run();
    ir.base.push(...entries);
    for (const [key] of entries) ir.trace.push({ key, where: "base" });
    return;
  }

  for (const [key, source] of branching.branches) {
    addVariant(ir, branching.group, key, run([branching.index, source]));
  }
}

function convertBlock(
  expression: Expression,
  ir: StyleIR,
  context: ClassifyContext,
  scope: Parameter | null,
): void {
  const classified = classifyBlock(expression, context);

  if (classified.kind === "fragment") {
    convertTemplate(classified.quasis, classified.interpolations, ir, context, scope);
    return;
  }

  const nested = emptyIR();
  convertTemplate(
    classified.quasis,
    classified.interpolations,
    nested,
    context,
    classified.scope,
  );

  if (nested.variants.size > 0) {
    throw new UnsupportedError("a prop-conditional block contains another prop conditional");
  }

  ir.usesTheme ||= nested.usesTheme || classified.usesTheme;
  for (const key of classified.keys) {
    addVariant(ir, classified.group, key, key === classified.activeKey ? nested.base : []);
  }
}

/* -- interpolation classification ----------------------------------------- */

type ValueClass =
  | { kind: "value"; source: string; usesTheme: boolean }
  | {
      kind: "branch";
      group: string;
      /** `[variantKey, expressionSource]` pairs. */
      branches: [string, string][];
      usesTheme: boolean;
    };

function classifyValue(expression: Expression, scope: Parameter | null): ValueClass {
  if (!Node.isArrowFunction(expression)) {
    if (scope) {
      // Inside a css`` fragment the outer arrow's parameter is still in scope,
      // so `${props.theme.x}` is a theme read even without its own arrow.
      const source = themeSource(expression, scope);
      if (source === null) {
        throw new UnsupportedError(
          `\`${expression.getText()}\` reads props other than the theme inside a css\`\` block`,
        );
      }
      return { kind: "value", source, usesTheme: true };
    }

    // A module constant, a literal, an imported value — nothing prop- or
    // theme-dependent, so it survives verbatim.
    return { kind: "value", source: expression.getText(), usesTheme: false };
  }

  const parameter = readParameter(expression);
  const reduced = arrowBody(expression);
  if (!reduced || reduced.kind !== "expression") {
    throw new UnsupportedError("an interpolation uses a function body we cannot reduce");
  }
  const body = reduced.node;

  const themeOnly = themeSource(body, parameter);
  if (themeOnly !== null) return { kind: "value", source: themeOnly, usesTheme: true };

  if (Node.isConditionalExpression(body)) {
    const condition = readCondition(unwrap(body.getCondition()), parameter);
    const whenTrue = requireThemeSource(unwrap(body.getWhenTrue()), parameter);
    const whenFalse = requireThemeSource(unwrap(body.getWhenFalse()), parameter);

    return {
      kind: "branch",
      group: condition.group,
      branches: condition.negated
        ? [
            [condition.key, whenFalse],
            ["default", whenTrue],
          ]
        : [
            [condition.key, whenTrue],
            ["default", whenFalse],
          ],
      usesTheme: true,
    };
  }

  throw new UnsupportedError(`prop-dependent interpolation \`${expression.getText()}\``);
}

type BlockClass = {
  kind: "fragment" | "conditional";
  quasis: string[];
  interpolations: Expression[];
  group: string;
  keys: string[];
  activeKey: string;
  usesTheme: boolean;
  /** The arrow parameter the block's interpolations close over. */
  scope: Parameter | null;
};

function classifyBlock(expression: Expression, context: ClassifyContext): BlockClass {
  const fragment = (quasis: string[], interpolations: Expression[]): BlockClass => ({
    kind: "fragment",
    quasis,
    interpolations,
    group: "",
    keys: [],
    activeKey: "",
    usesTheme: false,
    scope: null,
  });

  if (Node.isIdentifier(expression)) {
    const name = expression.getText();
    const known = context.fragments.get(name) ?? context.resolveFragment?.(name);
    if (!known) {
      throw new UnsupportedError(`\`\${${name}}\` does not resolve to a css\`\` fragment`);
    }
    return fragment(known.quasis, known.interpolations);
  }

  if (isCssTemplate(expression)) {
    const read = readTaggedTemplate(expression);
    return fragment(read.quasis, read.interpolations);
  }

  if (!Node.isArrowFunction(expression)) {
    throw new UnsupportedError(`unsupported block interpolation \`${expression.getText()}\``);
  }

  const parameter = readParameter(expression);
  const reduced = arrowBody(expression);
  if (!reduced) {
    throw new UnsupportedError("a block interpolation uses a function body we cannot reduce");
  }

  // `(props) => props.x && css\`…\`` and `(props) => props.x ? css\`…\` : …`
  let condition: Expression;
  let branch: Node;

  if (reduced.kind === "guard") {
    condition = reduced.condition;
    branch = reduced.branch;
  } else if (
    Node.isBinaryExpression(reduced.node) &&
    reduced.node.getOperatorToken().getText() === "&&"
  ) {
    condition = unwrap(reduced.node.getLeft());
    branch = unwrap(reduced.node.getRight());
  } else if (Node.isConditionalExpression(reduced.node)) {
    condition = unwrap(reduced.node.getCondition());
    branch = unwrap(reduced.node.getWhenTrue());
    if (!isEmptyBranch(reduced.node.getWhenFalse())) {
      throw new UnsupportedError("a conditional block has two css branches");
    }
  } else {
    throw new UnsupportedError(`unsupported block interpolation \`${reduced.node.getText()}\``);
  }

  if (!isCssTemplate(branch)) {
    throw new UnsupportedError("a conditional block does not resolve to a css`` fragment");
  }

  const parsed = readCondition(condition, parameter);
  const read = readTaggedTemplate(branch as Expression);

  return {
    kind: "conditional",
    quasis: read.quasis,
    interpolations: read.interpolations,
    group: parsed.group,
    // A negated condition needs the matched key present-but-empty so Unistyles'
    // `default` bucket is what actually carries the styles.
    keys: parsed.negated ? [parsed.key, "default"] : [parsed.key],
    activeKey: parsed.negated ? "default" : parsed.key,
    usesTheme: false,
    scope: parameter,
  };
}

/* -- expression helpers --------------------------------------------------- */

/** Looks through parentheses and non-null assertions to the real expression. */
function unwrap(node: Node): Expression {
  let current = node;
  while (Node.isParenthesizedExpression(current) || Node.isNonNullExpression(current)) {
    current = current.getExpression();
  }
  return current as Expression;
}

type ArrowBody =
  | { kind: "expression"; node: Expression }
  /** `if (cond) { return X }` — `cond && X` written out longhand. */
  | { kind: "guard"; condition: Expression; branch: Expression };

/**
 * The expression an interpolation arrow reduces to.
 *
 * Concise bodies come back as-is. Block bodies are accepted in the two shapes
 * that appear in practice: a lone `return`, and a single `if` with no `else`
 * whose branch returns a css`` fragment.
 */
function arrowBody(arrow: Expression): ArrowBody | null {
  if (!Node.isArrowFunction(arrow)) return null;

  const body = arrow.getBody();
  if (Node.isExpression(body)) return { kind: "expression", node: unwrap(body) };
  if (!Node.isBlock(body)) return null;

  const statements = body.getStatements();
  if (statements.length !== 1) return null;
  const statement = statements[0]!;

  if (Node.isReturnStatement(statement)) {
    const expression = statement.getExpression();
    return expression ? { kind: "expression", node: unwrap(expression) } : null;
  }

  if (!Node.isIfStatement(statement) || statement.getElseStatement()) return null;

  const then = statement.getThenStatement();
  const inner = Node.isBlock(then) ? then.getStatements() : [then];
  if (inner.length !== 1) return null;

  const returned = inner[0];
  if (!Node.isReturnStatement(returned)) return null;
  const expression = returned.getExpression();
  if (!expression) return null;

  return {
    kind: "guard",
    condition: unwrap(statement.getExpression()),
    branch: unwrap(expression),
  };
}

/** The single parameter of an interpolation arrow, as a name or a destructure. */
type Parameter = { kind: "identifier"; name: string } | { kind: "destructured"; names: string[] };

function readParameter(arrow: Expression): Parameter {
  if (!Node.isArrowFunction(arrow)) throw new UnsupportedError("expected an arrow function");
  const parameters = arrow.getParameters();
  if (parameters.length === 0) return { kind: "destructured", names: [] };
  if (parameters.length > 1) throw new UnsupportedError("interpolation takes several parameters");

  const name = parameters[0]!.getNameNode();
  if (Node.isIdentifier(name)) return { kind: "identifier", name: name.getText() };

  if (Node.isObjectBindingPattern(name)) {
    const names: string[] = [];
    for (const element of name.getElements()) {
      if (element.getDotDotDotToken()) throw new UnsupportedError("interpolation uses a rest param");
      const propertyName = element.getPropertyNameNode()?.getText();
      const binding = element.getNameNode().getText();
      if (propertyName && propertyName !== binding) {
        throw new UnsupportedError("interpolation renames a destructured prop");
      }
      names.push(binding);
    }
    return { kind: "destructured", names };
  }

  throw new UnsupportedError("interpolation uses an unsupported parameter pattern");
}

/**
 * Source for an expression that reads nothing but the theme, with `props.theme`
 * rewritten to the bare `theme` that `StyleSheet.create` hands out. Returns
 * `null` when the expression touches any other prop.
 */
function themeSource(body: Node, parameter: Parameter): string | null {
  if (parameter.kind === "destructured") {
    if (parameter.names.some((name) => name !== "theme")) return null;
    return body.getText();
  }

  const start = body.getStart();
  const replacements: [number, number][] = [];
  let clean = true;

  body.forEachDescendant((node) => {
    if (!Node.isIdentifier(node) || node.getText() !== parameter.name) return;

    const parent = node.getParent();
    if (Node.isPropertyAccessExpression(parent)) {
      if (parent.getNameNode() === node) return; // `something.props`, not our param
      if (parent.getName() === "theme") {
        replacements.push([parent.getStart() - start, parent.getEnd() - start]);
        return;
      }
    }
    clean = false;
  });

  if (!clean) return null;

  const text = body.getText();
  let out = "";
  let cursor = 0;
  for (const [from, to] of replacements.sort((a, b) => a[0] - b[0])) {
    out += text.slice(cursor, from) + "theme";
    cursor = to;
  }
  return out + text.slice(cursor);
}

function requireThemeSource(node: Node, parameter: Parameter): string {
  const source = themeSource(node, parameter);
  if (source === null) {
    throw new UnsupportedError(`branch \`${node.getText()}\` reads props other than the theme`);
  }
  return source;
}

interface ParsedCondition {
  group: string;
  key: string;
  negated: boolean;
}

/** `props.isFirst`, `!props.x`, `props.variant === "outline"`, `props.v !== "x"`. */
function readCondition(condition: Node, parameter: Parameter): ParsedCondition {
  if (
    Node.isPrefixUnaryExpression(condition) &&
    condition.getOperatorToken() === SyntaxKind.ExclamationToken
  ) {
    const inner = readCondition(condition.getOperand(), parameter);
    if (inner.negated) throw new UnsupportedError("double-negated condition");
    return { ...inner, negated: true };
  }

  if (Node.isBinaryExpression(condition)) {
    const operator = condition.getOperatorToken().getText();
    if (operator !== "===" && operator !== "!==") {
      throw new UnsupportedError(`unsupported condition operator \`${operator}\``);
    }
    const group = readPropName(condition.getLeft(), parameter);
    const right = condition.getRight();
    if (!Node.isStringLiteral(right)) {
      throw new UnsupportedError(`condition compares against \`${right.getText()}\``);
    }
    return { group, key: right.getLiteralValue(), negated: operator === "!==" };
  }

  return { group: readPropName(condition, parameter), key: "true", negated: false };
}

function readPropName(node: Node, parameter: Parameter): string {
  if (parameter.kind === "identifier") {
    if (Node.isPropertyAccessExpression(node) && node.getExpression().getText() === parameter.name) {
      return node.getName();
    }
  } else if (Node.isIdentifier(node) && parameter.names.includes(node.getText())) {
    return node.getText();
  }
  throw new UnsupportedError(`condition \`${node.getText()}\` is not a plain prop read`);
}

const isEmptyBranch = (node: Node) =>
  ["null", "undefined", '""', "``"].includes(node.getText().trim());

function isCssTemplate(node: Node): boolean {
  return (
    Node.isTaggedTemplateExpression(node) &&
    /^css$/.test(node.getTag().getText().replace(/^.*\./, ""))
  );
}

function readTaggedTemplate(node: Expression) {
  if (!Node.isTaggedTemplateExpression(node)) throw new UnsupportedError("expected a css`` tag");
  const template = node.getTemplate();

  if (Node.isNoSubstitutionTemplateLiteral(template)) {
    return { quasis: [template.getLiteralText()], interpolations: [] as Expression[] };
  }

  const quasis = [template.getHead().getLiteralText()];
  const interpolations: Expression[] = [];
  for (const span of template.getTemplateSpans()) {
    interpolations.push(span.getExpression());
    quasis.push(span.getLiteral().getLiteralText());
  }
  return { quasis, interpolations };
}

/* -- variant bookkeeping -------------------------------------------------- */

function addVariant(ir: StyleIR, group: string, key: string, entries: StyleEntry[]): void {
  const existing = ir.variants.get(group) ?? new Map<string, StyleEntry[]>();
  existing.set(key, dedupeKeepingLast([...(existing.get(key) ?? []), ...entries]));
  ir.variants.set(group, existing);
  for (const [name] of entries) ir.trace.push({ key: name, where: "variant" });
}

/**
 * Gives every boolean group an explicit `false` bucket.
 *
 * `${(props) => (props.x ? a : b)}` compiles to `{ true: a, default: b }`,
 * which reads like "b unless x" but is not what Unistyles does with it:
 * `default` is only consulted when the group was given *no* value, so a call
 * site that hands over a real `false` — which every one of ours does — matches
 * neither bucket and gets the base style back. styled-components' else-branch
 * covers both the false and the absent case, so both keys have to carry it.
 *
 * `false` is written before `default` so the emitted sheet reads
 * true/false/default rather than leaving the odd one out at the end.
 */
function mirrorBooleanFallback(ir: StyleIR): void {
  for (const [group, buckets] of ir.variants) {
    if (!buckets.has("true") || !buckets.has("default")) continue;

    const fallback = buckets.get("default")!;
    const ordered = new Map<string, StyleEntry[]>();

    // Rewritten rather than topped up: a `styled(Base)` clones the base's
    // groups before adding its own declarations to them, so a `false` copied
    // on the base's behalf would be a round out of date by now.
    for (const [key, entries] of buckets) {
      if (key === "false") continue;
      if (key === "default") ordered.set("false", fallback.slice());
      ordered.set(key, entries);
    }

    ir.variants.set(group, ordered);
  }
}

function cloneVariants(variants: VariantGroups): VariantGroups {
  return new Map(
    [...variants].map(([group, keys]) => [
      group,
      new Map([...keys].map(([key, entries]) => [key, entries.slice()])),
    ]),
  );
}

/**
 * styled-components resolves declarations in source order, so a plain
 * declaration written *after* a conditional block beats it. Unistyles always
 * merges variants on top of the base, which would silently invert that. A base
 * declaration written before the conditional is fine — that is the same
 * precedence in both systems.
 */
function assertNoLateOverride(ir: StyleIR): void {
  const lastVariant = new Map<string, number>();

  ir.trace.forEach((entry, index) => {
    if (entry.where === "variant") lastVariant.set(entry.key, index);
  });

  ir.trace.forEach((entry, index) => {
    if (entry.where !== "base") return;
    const variantIndex = lastVariant.get(entry.key);
    if (variantIndex !== undefined && variantIndex < index) {
      throw new UnsupportedError(
        `\`${entry.key}\` is set unconditionally after a prop conditional also sets it; ` +
          "Unistyles would flip the precedence",
      );
    }
  });
}
