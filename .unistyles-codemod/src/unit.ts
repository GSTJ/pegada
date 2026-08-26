/**
 * A *unit* is one styles module plus every file that renders its components.
 * Conversion is all-or-nothing per unit: half a module on Unistyles and half on
 * styled-components would still work (the two coexist), but it makes the diff
 * impossible to review, so a single unsupported definition skips the lot.
 *
 * Every unit runs in two passes. The first validates without touching
 * anything, so an unsupported case can abort cleanly; the second mutates,
 * re-querying the AST between edits because a JSX rewrite invalidates the node
 * handles around it.
 */

import type { StyleIR } from "./classify.ts";
import type { Base, CollectedModule, StyledDefinition } from "./collect.ts";
import type { DefinitionInfo } from "./ledger.ts";

import path from "node:path";

import {
  Node,
  Project,
  SyntaxKind,
  type ArrowFunction,
  type ImportDeclaration,
  type JsxAttribute,
  type JsxElement,
  type JsxOpeningElement,
  type JsxSelfClosingElement,
  type ObjectLiteralExpression,
  type SourceFile,
} from "ts-morph";

import { classifyDefinition, UnsupportedError } from "./classify.ts";
import { collectModule } from "./collect.ts";
import { emitStyleSheet } from "./emit.ts";

const RN_MODULE = "react-native";
const REANIMATED_MODULE = "react-native-reanimated";
const STYLED_MODULE = "styled-components/native";
const UNISTYLES_MODULE = "react-native-unistyles";

/**
 * The components Unistyles' babel plugin rewrites on its own (copied from
 * `plugin/src/consts.ts`). Only these keep a live link to the theme when handed
 * a `StyleSheet.create` style directly; everything else has to go through
 * `withUnistyles`, or it would render the boot theme and never update.
 *
 * `Modal` and `TouchableWithoutFeedback` are deliberately absent from the
 * plugin's list, so they are absent here too.
 */
const AUTO_PROCESSED = new Set([
  "ActivityIndicator",
  "Animated",
  "FlatList",
  "Image",
  "ImageBackground",
  "KeyboardAvoidingView",
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
  "View",
  "VirtualizedList",
]);

export interface UnitResult {
  file: string;
  status: "converted" | "skipped" | "ignored";
  reason?: string;
  definitions?: number;
  variants?: number;
  consumers?: string[];
  /** What the parity ledger needs to sample this module. */
  definitionsDetail?: DefinitionInfo[];
}

interface Attribute {
  name: string;
  initializer?: string;
}

interface ImportOrigin {
  moduleSpecifier: string;
  kind: "default" | "named" | "namespace";
  name: string;
}

interface PreparedDefinition {
  definition: StyledDefinition;
  ir: StyleIR;
  key: string;
  /**
   * `inline` swaps the JSX tag for the underlying react-native component;
   * `wrapper` keeps the tag and re-exports it through `withUnistyles`.
   */
  mode: "inline" | "wrapper";
  /** inline only — the component the JSX tag becomes, e.g. `Animated.View`. */
  element: string;
  /** inline only — the import a call site needs for `element`. */
  origin: ImportOrigin | null;
  /** wrapper only — the expression `withUnistyles` wraps. */
  wrapped: string;
  /** wrapper only — set when `wrapped` is a react-native tag needing an import. */
  primitiveTag: string | null;
  /** The same-module definition whose declarations were folded into `ir`. */
  inheritedFrom: string | null;
  /** wrapper only — `(theme) => ({ … })` for theme-derived props. */
  mapper: string | null;
  attributes: Attribute[];
}

/* -- entry point ---------------------------------------------------------- */

export function transformUnit(
  project: Project,
  file: SourceFile,
  externalBases: Set<string>,
): UnitResult {
  const relative = rel(file);
  const module = collectModule(file);

  if (module.malformed.length > 0) {
    const first = module.malformed[0]!;
    return { file: relative, status: "skipped", reason: `${first.name}: ${first.reason}` };
  }

  if (module.definitions.length === 0) {
    return { file: relative, status: "ignored", reason: "no styled definitions" };
  }

  try {
    // Most specific reason first, so the skip list says something useful.
    for (const definition of module.definitions) {
      if (externalBases.has(`${file.getFilePath()}#${definition.name}`)) {
        throw new UnsupportedError(
          `\`${definition.name}\` is wrapped by a styled() in another module`,
        );
      }
    }

    assertOnlyRendered(project, file, module);
    const prepared = prepare(module, externalBases);
    const consumers = planConsumers(project, file, module, prepared);
    const self = planSelfConsumer(file, module, prepared);

    // The module's own JSX first: it still refers to the definitions by name,
    // and `applyStylesModule` is about to delete them.
    self?.apply();
    // Keep `export` unless the module renders its own components and nobody
    // else imports them — that is the only case where the sheet is private.
    applyStylesModule(module, prepared, consumers.length > 0 || self === null);
    for (const consumer of consumers) consumer.apply();

    return {
      file: relative,
      status: "converted",
      definitions: prepared.length,
      variants: prepared.reduce((total, item) => total + item.ir.variants.size, 0),
      consumers: consumers.map((consumer) => rel(consumer.file)),
      definitionsDetail: prepared.map((item) => ({
        name: item.definition.name,
        key: item.key,
        mode: item.mode,
        variants: Object.fromEntries(
          [...item.ir.variants].map(([group, buckets]) => [group, [...buckets.keys()]]),
        ),
        inheritedFrom: item.inheritedFrom,
      })),
    };
  } catch (error) {
    if (error instanceof UnsupportedError) {
      return { file: relative, status: "skipped", reason: error.message };
    }
    throw error;
  }
}

/* -- preparation ---------------------------------------------------------- */

function prepare(module: CollectedModule, externalBases: Set<string>): PreparedDefinition[] {
  const fragments = new Map(module.fragments.map((fragment) => [fragment.name, fragment]));
  const locals = new Map<string, StyleIR>();
  const bases = new Map<string, ResolvedBase>();
  const prepared: PreparedDefinition[] = [];
  const usedKeys = new Set<string>();

  for (const definition of module.definitions) {
    if (externalBases.has(`${module.file.getFilePath()}#${definition.name}`)) {
      throw new UnsupportedError(
        `\`${definition.name}\` is used as a styled() base in another module`,
      );
    }

    const ir = classifyDefinition(definition, {
      fragments,
      locals,
      resolveFragment: (name) => importedFragment(module.file, name),
    });
    locals.set(definition.name, ir);

    // A same-module base is folded into this definition's own IR; anything else
    // keeps applying its styles itself at render time.
    const inheritedFrom =
      definition.base.kind === "component" && bases.has(definition.base.expression)
        ? definition.base.expression
        : null;

    const base = resolveBase(module, definition.base, bases);
    bases.set(definition.name, base);

    const attrs = readAttributes(definition);
    const parent = inheritedFrom
      ? prepared.find((item) => item.definition.name === inheritedFrom)
      : undefined;

    // `.attrs()` concatenate down a styled() chain, so a definition that
    // absorbs its parent's declarations has to absorb its parent's attrs too —
    // otherwise `styled(Title)` quietly loses the `fontSize` Title set.
    const attributes = mergeAttributes(parent?.attributes ?? [], attrs.literals);
    const mapper = attrs.mapper ?? parent?.mapper ?? null;
    const wrapper = !base.autoProcessed || mapper !== null;

    prepared.push({
      definition,
      ir,
      key: uniqueKey(definition.name, usedKeys),
      mode: wrapper ? "wrapper" : "inline",
      element: base.element,
      origin: base.origin,
      wrapped: base.element,
      primitiveTag: base.primitiveTag,
      inheritedFrom,
      mapper,
      attributes,
    });
  }

  return prepared;
}

/**
 * A styled component that is *rendered* can become a style object. One that is
 * also passed around — as `ItemSeparatorComponent`, as an `errorFallback`, as
 * the argument to `React.ComponentPropsWithoutRef` — cannot: whatever receives
 * it expects a component of that exact shape. Those units stay on
 * styled-components.
 */
function assertOnlyRendered(
  project: Project,
  stylesFile: SourceFile,
  module: CollectedModule,
): void {
  const names = new Set(module.definitions.map((definition) => definition.name));

  const complain = (name: string, file: SourceFile): never => {
    throw new UnsupportedError(
      `\`${name}\` is used as a value, not just rendered, in ${rel(file)}`,
    );
  };

  // Inside the styles module, references from one definition to another are the
  // ordinary `styled(Other)` inheritance and do not count.
  const own = module.definitions.map(
    (definition) =>
      [definition.statement.getStart(), definition.statement.getEnd()] as const,
  );

  for (const identifier of stylesFile.getDescendantsOfKind(SyntaxKind.Identifier)) {
    if (!names.has(identifier.getText())) continue;
    if (own.some(([from, to]) => identifier.getStart() >= from && identifier.getEnd() <= to)) {
      continue;
    }
    if (isJsxTagName(identifier) || isMemberName(identifier)) continue;
    complain(identifier.getText(), stylesFile);
  }

  for (const file of project.getSourceFiles()) {
    if (file === stylesFile) continue;

    // Type-only imports count too: `typeof S.Container` breaks just as loudly.
    const declarations = file
      .getImportDeclarations()
      .filter((candidate) => candidate.getModuleSpecifierSourceFile() === stylesFile);
    if (declarations.length === 0) continue;

    const locals = new Map<string, string>();
    const namespaces = new Set<string>();
    for (const declaration of declarations) {
      for (const specifier of declaration.getNamedImports()) {
        if (!names.has(specifier.getName())) continue;
        locals.set(specifier.getAliasNode()?.getText() ?? specifier.getName(), specifier.getName());
      }
      const namespace = declaration.getNamespaceImport()?.getText();
      if (namespace) namespaces.add(namespace);
    }

    for (const identifier of file.getDescendantsOfKind(SyntaxKind.Identifier)) {
      const parent = identifier.getParent();

      // `S.Container` outside a JSX tag. A namespace hides the reference from a
      // plain identifier scan, so match the member name instead. In a type
      // position (`typeof S.Container`) the same text parses as a QualifiedName
      // rather than a property access.
      const qualifier =
        Node.isPropertyAccessExpression(parent) && parent.getNameNode() === identifier
          ? parent.getExpression().getText()
          : Node.isQualifiedName(parent) && parent.getRight() === identifier
            ? parent.getLeft().getText()
            : null;

      if (qualifier && namespaces.has(qualifier) && names.has(identifier.getText())) {
        if (!Node.isPropertyAccessExpression(parent) || !isJsxTagName(parent)) {
          complain(identifier.getText(), file);
        }
      }

      const name = locals.get(identifier.getText());
      if (!name) continue;
      if (isInsideImport(identifier) || isJsxTagName(identifier) || isMemberName(identifier)) {
        continue;
      }
      complain(name, file);
    }
  }
}

/**
 * A css`` fragment imported from another module. Fragments are pure
 * declaration lists, so inlining one is exactly what styled-components would
 * have done at runtime — and it keeps the two modules independent.
 */
function importedFragment(file: SourceFile, name: string) {
  for (const declaration of file.getImportDeclarations()) {
    const specifier = declaration
      .getNamedImports()
      .find((named) => (named.getAliasNode()?.getText() ?? named.getName()) === name);
    if (!specifier) continue;

    const source = declaration.getModuleSpecifierSourceFile();
    if (!source) return null;

    const found = collectModule(source).fragments.find(
      (fragment) => fragment.name === specifier.getName(),
    );
    return found ? { quasis: found.quasis, interpolations: found.interpolations } : null;
  }
  return null;
}

/** Later attrs win, which is the order styled-components applies them in. */
function mergeAttributes(parent: Attribute[], own: Attribute[]): Attribute[] {
  const byName = new Map(parent.map((attribute) => [attribute.name, attribute]));
  for (const attribute of own) byName.set(attribute.name, attribute);
  return [...byName.values()];
}

function uniqueKey(name: string, used: Set<string>): string {
  const base = name.charAt(0).toLowerCase() + name.slice(1);
  let key = base;
  let suffix = 2;
  while (used.has(key)) key = `${base}${suffix++}`;
  used.add(key);
  return key;
}

interface ResolvedBase {
  element: string;
  origin: ImportOrigin | null;
  /** Whether Unistyles' babel plugin keeps this component's styles in sync. */
  autoProcessed: boolean;
  /** Set when the base is a react-native tag, which the module must import. */
  primitiveTag: string | null;
}

function resolveBase(
  module: CollectedModule,
  base: Base,
  known: Map<string, ResolvedBase>,
): ResolvedBase {
  if (base.kind === "primitive") {
    return {
      element: base.tag,
      origin: { moduleSpecifier: RN_MODULE, kind: "named", name: base.tag },
      autoProcessed: AUTO_PROCESSED.has(base.tag),
      primitiveTag: base.tag,
    };
  }

  const inherited = known.get(base.expression);
  if (inherited) return inherited;

  if (!base.rootIdentifier) {
    throw new UnsupportedError(`styled(${base.expression}) has no importable base`);
  }

  const origin = findImportOrigin(module.file, base.rootIdentifier);
  if (!origin) {
    throw new UnsupportedError(
      `\`${base.rootIdentifier}\` is not imported, so call sites cannot import it either`,
    );
  }

  const specifier = origin.moduleSpecifier;
  const autoProcessed =
    specifier === REANIMATED_MODULE ||
    (specifier === RN_MODULE && AUTO_PROCESSED.has(base.expression.split(".").pop() ?? ""));

  return { element: base.expression, origin, autoProcessed, primitiveTag: null };
}

function findImportOrigin(file: SourceFile, name: string): ImportOrigin | null {
  for (const declaration of file.getImportDeclarations()) {
    const moduleSpecifier = declaration.getModuleSpecifierValue();

    if (declaration.getDefaultImport()?.getText() === name) {
      return { moduleSpecifier, kind: "default", name };
    }
    if (declaration.getNamespaceImport()?.getText() === name) {
      return { moduleSpecifier, kind: "namespace", name };
    }
    for (const specifier of declaration.getNamedImports()) {
      const local = specifier.getAliasNode()?.getText() ?? specifier.getName();
      if (local !== name) continue;
      if (specifier.getAliasNode()) {
        throw new UnsupportedError(`\`${name}\` is an aliased import; refusing to move it`);
      }
      return { moduleSpecifier, kind: "named", name };
    }
  }
  return null;
}

interface ReadAttrs {
  /** Literal props that become JSX attributes at every call site. */
  literals: Attribute[];
  /** Theme-derived props, as the `withUnistyles` mapper source. */
  mapper: string | null;
}

/**
 * Two shapes of `.attrs()` survive.
 *
 * A plain object of literals moves to the call sites as JSX attributes. A
 * `(props) => ({ … })` that reads nothing but the theme becomes the
 * `withUnistyles` mapper — which is the same idea (props derived from the
 * theme) expressed the way Unistyles wants it. Anything else stays on
 * styled-components.
 */
function readAttributes(definition: StyledDefinition): ReadAttrs {
  const attrs = definition.attrs;
  if (!attrs) return { literals: [], mapper: null };

  if (Node.isArrowFunction(attrs)) {
    const object = attrsObject(attrs);

    // `(props) => ({ pointerEvents: "none", ...props })` reads nothing; it is a
    // set of defaults dressed up as a function. Those belong at the call sites
    // like any other literal attrs — a withUnistyles mapper would only widen
    // their types and cost a wrapper.
    const parameterName = attrs.getParameters()[0]?.getNameNode().getText();
    if (object && isLiteralOnly(object, parameterName)) {
      return { literals: readLiteralAttributes(definition, object), mapper: null };
    }

    return { literals: [], mapper: readAttrsMapper(definition, attrs) };
  }

  // `.attrs(getGradientProps)` — a named helper instead of an inline arrow. If
  // it reads nothing but the theme it becomes the mapper by application, which
  // leaves the helper itself untouched and still exported.
  if (Node.isIdentifier(attrs)) {
    const helper = localArrow(definition.statement.getSourceFile(), attrs.getText());
    if (helper && readsOnlyTheme(helper)) {
      return { literals: [], mapper: `(theme) => ${attrs.getText()}({ theme })` };
    }
    throw new UnsupportedError(
      `\`${definition.name}\` passes \`${attrs.getText()}\` to .attrs(), which we cannot prove reads only the theme`,
    );
  }

  if (!Node.isObjectLiteralExpression(attrs)) {
    throw new UnsupportedError(`\`${definition.name}\` passes an unsupported value to .attrs()`);
  }

  const properties = attrs.getProperties();
  const portable = properties.every(
    (property) =>
      Node.isPropertyAssignment(property) && isPortable(property.getInitializerOrThrow()),
  );

  if (portable) return { literals: readLiteralAttributes(definition, attrs), mapper: null };

  // Something in here reads module scope (a `const HIT_SLOP`, an imported
  // asset). Keeping the object where it is — inside a `withUnistyles` mapper in
  // this same module — is the only way those references survive.
  for (const property of properties) {
    if (!Node.isPropertyAssignment(property)) {
      throw new UnsupportedError(`\`${definition.name}\` uses a shorthand or spread in .attrs()`);
    }
  }

  return { literals: [], mapper: `() => (${attrs.getText()})` };
}

/**
 * Marks a mapper's returned object `as const`.
 *
 * `.attrs()` was typed loosely enough not to care, but `withUnistyles` checks
 * the mapper against the component's real props — and third-party components
 * like LinearGradient type theirs as tuples and string unions. Without this,
 * `colors: [a, b]` widens to `string[]` and `pointerEvents: "none"` widens to
 * `string`, and neither is assignable.
 */
function tightenMapper(source: string): string {
  const project = new Project({ useInMemoryFileSystem: true });
  const file = project.createSourceFile("mapper.ts", `const mapper = ${source};`);
  const arrow = file
    .getVariableDeclarationOrThrow("mapper")
    .getInitializerIfKindOrThrow(SyntaxKind.ArrowFunction);

  const body = arrow.getBody();
  const targets = Node.isBlock(body)
    ? body
        .getDescendantsOfKind(SyntaxKind.ReturnStatement)
        .map((statement) => statement.getExpression())
    : [Node.isParenthesizedExpression(body) ? body.getExpression() : body];

  // Reverse order: replacing text forgets the nodes that follow it.
  for (const target of targets.reverse()) {
    if (target && Node.isObjectLiteralExpression(target)) {
      target.replaceWithText(`${target.getText()} as const`);
    }
  }

  return arrow.getText();
}

/** A module-scope `const name = (…) => …`, or null. */
function localArrow(file: SourceFile, name: string): ArrowFunction | null {
  const declaration = file
    .getVariableDeclarations()
    .find((candidate) => candidate.getName() === name);
  const initializer = declaration?.getInitializer();
  return initializer && Node.isArrowFunction(initializer) ? initializer : null;
}

const readsOnlyTheme = (arrow: ArrowFunction) =>
  themeExpression(arrow.getBody(), arrow.getParameters()[0]?.getNameNode()) !== null;

function readAttrsMapper(definition: StyledDefinition, attrs: ArrowFunction): string {
  const object = attrsObject(attrs);

  // A body we cannot reduce to a single object literal — a block that computes
  // intermediates first, say — still works as a mapper verbatim, as long as the
  // only prop it reaches for is the theme.
  if (!object) {
    const rewritten = themeExpression(attrs.getBody(), attrs.getParameters()[0]?.getNameNode());
    if (rewritten === null) {
      throw new UnsupportedError(
        `\`${definition.name}\` computes .attrs() from props other than the theme`,
      );
    }
    const mapper = /\btheme\b/.test(rewritten) ? `(theme) => ${rewritten}` : `() => ${rewritten}`;
    return tightenMapper(mapper);
  }

  const parameter = attrs.getParameters()[0];
  const name = parameter?.getNameNode();
  const properties = object.getProperties();

  const entries = properties.flatMap((property, index) => {
    // A trailing `...props` is styled-components' way of saying "these are
    // defaults, the caller wins" — which is exactly what a withUnistyles mapper
    // already does, so it drops out.
    if (Node.isSpreadAssignment(property)) {
      const spread = property.getExpression().getText();
      if (index === properties.length - 1 && name && spread === name.getText()) return [];
      throw new UnsupportedError(`\`${definition.name}\` spreads \`${spread}\` inside .attrs()`);
    }

    if (!Node.isPropertyAssignment(property)) {
      throw new UnsupportedError(`\`${definition.name}\` uses a shorthand inside .attrs()`);
    }
    const key = property.getName();
    const value = property.getInitializerOrThrow();

    if (isPortable(value)) return [`${key}: ${value.getText()}`];

    const source = themeExpression(value, name);
    if (source === null) {
      throw new UnsupportedError(
        `\`${definition.name}\` computes .attrs({ ${key} }) from props other than the theme`,
      );
    }
    return [`${key}: ${source}`];
  });

  const body = `({ ${entries.join(", ")} })`;
  // Only name the parameter if something reads it; an unused one is a lint
  // error, and plenty of `.attrs()` functions never touched the theme.
  return /\btheme\b/.test(body) ? `(theme) => ${body}` : `() => ${body}`;
}

function attrsObject(attrs: ArrowFunction): ObjectLiteralExpression | null {
  const body = attrs.getBody();
  if (Node.isParenthesizedExpression(body)) {
    const inner = body.getExpression();
    return Node.isObjectLiteralExpression(inner) ? inner : null;
  }
  if (Node.isObjectLiteralExpression(body)) return body;
  if (!Node.isBlock(body)) return null;

  const statements = body.getStatements();
  if (statements.length !== 1) return null;
  const statement = statements[0]!;
  if (!Node.isReturnStatement(statement)) return null;

  let returned = statement.getExpression();
  while (returned && Node.isParenthesizedExpression(returned)) returned = returned.getExpression();
  return returned && Node.isObjectLiteralExpression(returned) ? returned : null;
}

/** `props.theme.colors.x` → `theme.colors.x`, or `null` if other props leak in. */
function themeExpression(value: Node, parameter: Node | undefined): string | null {
  if (!parameter) return value.getText();

  if (Node.isObjectBindingPattern(parameter)) {
    const names = parameter.getElements().map((element) => element.getNameNode().getText());
    if (names.some((name) => name !== "theme")) return null;
    return value.getText();
  }

  if (!Node.isIdentifier(parameter)) return null;
  const parameterName = parameter.getText();

  const start = value.getStart();
  const cuts: [number, number][] = [];
  let clean = true;

  value.forEachDescendant((node) => {
    if (!Node.isIdentifier(node) || node.getText() !== parameterName) return;
    const parent = node.getParent();
    if (Node.isPropertyAccessExpression(parent) && parent.getExpression() === node) {
      if (parent.getName() === "theme") {
        cuts.push([parent.getStart() - start, parent.getEnd() - start]);
        return;
      }
    }
    clean = false;
  });

  if (!clean) return null;

  const text = value.getText();
  let out = "";
  let cursor = 0;
  for (const [from, to] of cuts.sort((a, b) => a[0] - b[0])) {
    out += text.slice(cursor, from) + "theme";
    cursor = to;
  }
  return out + text.slice(cursor);
}

/**
 * `.attrs({ accessible: true })` becomes plain JSX attributes at every call
 * site. Only literals qualify — anything referencing module scope (another
 * const, an imported value) would not resolve once moved.
 */
function isLiteralOnly(object: ObjectLiteralExpression, parameterName: string | undefined) {
  const properties = object.getProperties();
  return properties.every((property, index) => {
    if (Node.isSpreadAssignment(property)) {
      return index === properties.length - 1 && property.getExpression().getText() === parameterName;
    }
    return Node.isPropertyAssignment(property) && isPortable(property.getInitializerOrThrow());
  });
}

function readLiteralAttributes(
  definition: StyledDefinition,
  attrs: ObjectLiteralExpression,
): Attribute[] {
  return attrs.getProperties().flatMap((property) => {
    if (Node.isSpreadAssignment(property)) return [];

    if (!Node.isPropertyAssignment(property)) {
      throw new UnsupportedError(`\`${definition.name}\` uses a shorthand or spread in .attrs()`);
    }

    const name = property.getName().replace(/^["']|["']$/g, "");
    const value = property.getInitializerOrThrow();

    if (Node.isStringLiteral(value)) {
      return { name, initializer: JSON.stringify(value.getLiteralValue()) };
    }
    if (value.getKind() === SyntaxKind.TrueKeyword) return { name };
    if (isPortable(value)) return { name, initializer: `{${value.getText()}}` };

    throw new UnsupportedError(
      `\`${definition.name}\` sets .attrs({ ${name}: ${value.getText()} }), which does not survive the move to a call site`,
    );
  });
}

/**
 * Whether an expression means the same thing pasted into another file.
 * Literals do; anything reading a module-scope binding does not. `require()`
 * with a `@/…` path is the one exception — the alias resolves from anywhere.
 */
function isPortable(node: Node): boolean {
  const kind = node.getKind();
  if (
    kind === SyntaxKind.TrueKeyword ||
    kind === SyntaxKind.FalseKeyword ||
    kind === SyntaxKind.NullKeyword ||
    Node.isNumericLiteral(node) ||
    Node.isStringLiteral(node) ||
    Node.isNoSubstitutionTemplateLiteral(node)
  ) {
    return true;
  }

  if (Node.isPrefixUnaryExpression(node)) return isPortable(node.getOperand());

  if (Node.isArrayLiteralExpression(node)) {
    return node.getElements().every(isPortable);
  }

  if (Node.isObjectLiteralExpression(node)) {
    return node.getProperties().every((property) => {
      if (!Node.isPropertyAssignment(property)) return false;
      const name = property.getNameNode();
      if (!Node.isIdentifier(name) && !Node.isStringLiteral(name)) return false;
      return isPortable(property.getInitializerOrThrow());
    });
  }

  if (Node.isCallExpression(node) && node.getExpression().getText() === "require") {
    const argument = node.getArguments()[0];
    return (
      node.getArguments().length === 1 &&
      Node.isStringLiteral(argument) &&
      argument.getLiteralValue().startsWith("@/")
    );
  }

  return false;
}

/* -- consumers ------------------------------------------------------------ */

interface ConsumerPlan {
  file: SourceFile;
  apply: () => void;
}

type Tags = Map<string, PreparedDefinition>;

function planConsumers(
  project: Project,
  stylesFile: SourceFile,
  module: CollectedModule,
  prepared: PreparedDefinition[],
): ConsumerPlan[] {
  const byName = new Map(prepared.map((item) => [item.definition.name, item]));
  const plans: ConsumerPlan[] = [];

  for (const file of project.getSourceFiles()) {
    if (file === stylesFile) continue;

    // A consumer often has two imports from the same styles module — a
    // `import type { … }` line and a value one. Looking at only the first would
    // silently leave the whole file untouched.
    const declarations = importsOf(file, stylesFile);
    if (declarations.length === 0) continue;

    const tags = tagsFor(declarations, byName);
    if (tags.size === 0) continue;

    validateConsumer(file, tags);
    plans.push({ file, apply: () => applyConsumer(file, declarations, tags, byName, module) });
  }

  return plans;
}

/**
 * Some modules define their styled components and render them in the same
 * file (`services/app-review.tsx`). Those are their own call site — with no
 * imports to rewrite, since `styles` will be declared right there.
 */
function planSelfConsumer(
  file: SourceFile,
  module: CollectedModule,
  prepared: PreparedDefinition[],
): ConsumerPlan | null {
  const tags: Tags = new Map(prepared.map((item) => [item.definition.name, item]));
  if (collectJsx(file, tags).length === 0) return null;

  validateConsumer(file, tags);

  return {
    file,
    apply: () => {
      for (let guard = 0; ; guard += 1) {
        if (guard > 1000) throw new Error(`runaway JSX rewrite in ${rel(file)}`);
        const use = collectJsx(file, tags).find((candidate) => !isConverted(candidate, "styles"));
        if (!use) break;
        convertElement(file, use, module, "styles");
      }
    },
  };
}

const importsOf = (file: SourceFile, target: SourceFile) =>
  file
    .getImportDeclarations()
    .filter(
      (candidate) =>
        candidate.getModuleSpecifierSourceFile() === target && !candidate.isTypeOnly(),
    );

function tagsFor(
  declarations: ImportDeclaration[],
  byName: Map<string, PreparedDefinition>,
): Tags {
  const tags: Tags = new Map();

  for (const declaration of declarations) {
    for (const specifier of declaration.getNamedImports()) {
      if (specifier.isTypeOnly()) continue;
      const prepared = byName.get(specifier.getName());
      if (prepared) tags.set(specifier.getAliasNode()?.getText() ?? specifier.getName(), prepared);
    }

    const namespace = declaration.getNamespaceImport()?.getText();
    if (namespace) {
      for (const [name, prepared] of byName) tags.set(`${namespace}.${name}`, prepared);
    }
  }

  return tags;
}

/* -- consumer validation -------------------------------------------------- */

function validateConsumer(file: SourceFile, tags: Tags): void {
  /** hostStart → group → the single value expression allowed for that group. */
  const hostVariants = new Map<number, Map<string, string>>();

  for (const use of collectJsx(file, tags)) {
    const { prepared } = use;

    if (prepared.mode === "inline" && tags.has(prepared.element)) {
      throw new UnsupportedError(
        `\`${prepared.definition.name}\` renders as \`${prepared.element}\`, which this unit also defines`,
      );
    }

    const opening = openingOf(use.node);
    const attributes = readJsxAttributes(file, use.tag, opening, prepared);

    for (const attribute of prepared.attributes) {
      if (attributes.has(attribute.name)) {
        throw new UnsupportedError(
          `<${use.tag}> in ${rel(file)} overrides .attrs({ ${attribute.name} }), ` +
            "which styled-components would have won",
        );
      }
    }

    if (prepared.ir.variants.size === 0) continue;

    const host = enclosingBlock(file, opening, use.tag);
    const groups = hostVariants.get(host.getStart()) ?? new Map<string, string>();

    for (const group of prepared.ir.variants.keys()) {
      const attribute = attributes.get(group);
      const value = attribute ? readAttributeValue(attribute) : "undefined";
      const existing = groups.get(group);
      // `useVariants` is scoped to the whole stylesheet, not to one style key,
      // so two elements in the same component cannot disagree about a group.
      if (existing !== undefined && existing !== value) {
        throw new UnsupportedError(
          `two elements in the same component need different \`${group}\` variants in ${rel(file)}`,
        );
      }
      groups.set(group, value);
    }

    hostVariants.set(host.getStart(), groups);
  }
}

function readJsxAttributes(
  file: SourceFile,
  tag: string,
  opening: JsxOpeningElement | JsxSelfClosingElement,
  prepared: PreparedDefinition,
): Map<string, JsxAttribute> {
  const attributes = opening.getAttributes();

  // A spread is only a problem when we need to know what a specific prop is:
  // it might carry a variant, or override an attr we are about to inline.
  const needsKnownProps = prepared.ir.variants.size > 0 || prepared.attributes.length > 0;
  if (needsKnownProps && attributes.some((attribute) => Node.isJsxSpreadAttribute(attribute))) {
    throw new UnsupportedError(
      `<${tag}> in ${rel(file)} spreads props, so its variants and attrs cannot be resolved`,
    );
  }

  return new Map(
    attributes
      .filter((attribute): attribute is JsxAttribute => Node.isJsxAttribute(attribute))
      .map((attribute) => [attribute.getNameNode().getText(), attribute]),
  );
}

/* -- consumer mutation ---------------------------------------------------- */

function applyConsumer(
  file: SourceFile,
  declarations: ImportDeclaration[],
  tags: Tags,
  byName: Map<string, PreparedDefinition>,
  module: CollectedModule,
): void {
  const stylesName = addStylesImport(file, declarations[0]!);

  // Re-query between edits: rewriting one JSX element forgets the ts-morph
  // handles around it, so a list captured up front would go stale.
  const pending = (): JsxUse | undefined =>
    collectJsx(file, tags).find((use) => !isConverted(use, stylesName));

  for (let guard = 0; ; guard += 1) {
    if (guard > 1000) throw new Error(`runaway JSX rewrite in ${rel(file)}`);
    const use = pending();
    if (!use) break;
    convertElement(file, use, module, stylesName);
  }

  for (const declaration of declarations) {
    for (const specifier of [...declaration.getNamedImports()]) {
      const prepared = byName.get(specifier.getName());
      // Wrapper-mode definitions keep their name and their import; only the
      // ones that turned into a bare react-native tag stop being referenced.
      if (prepared?.mode === "inline" && !specifier.isTypeOnly()) specifier.remove();
    }

    if (
      declaration.getNamedImports().length === 0 &&
      !declaration.getNamespaceImport() &&
      !declaration.getDefaultImport()
    ) {
      declaration.remove();
    }
  }

  separateImports(file);
}

function convertElement(
  file: SourceFile,
  use: JsxUse,
  module: CollectedModule,
  stylesName: string,
): void {
  const { prepared } = use;
  const opening = openingOf(use.node);
  const attributes = readJsxAttributes(file, use.tag, opening, prepared);

  const variantArguments = [...prepared.ir.variants.keys()].map((group) => {
    const attribute = attributes.get(group);
    return [group, attribute ? readAttributeValue(attribute) : "undefined"] as const;
  });

  const host = variantArguments.length > 0 ? enclosingBlock(file, opening, use.tag) : null;

  const styleAttribute = attributes.get("style");
  // Whatever the call site already puts in `style` — a written prop, or a
  // spread that carries one. styled-components *merged* that on top of the
  // component's own css (it rendered `style={[generated, incoming]}`), so it
  // follows our stylesheet entry in the array instead of displacing it.
  const override = styleOverride(file, use.tag, opening);
  const styleSource = override
    ? `{[${stylesName}.${prepared.key}, ${override}]}`
    : `{${stylesName}.${prepared.key}}`;

  // JSX resolves duplicate props last-wins, so the attribute has to sit after
  // every spread that could restate `style`. Writing it before one (which is
  // what this used to do) hands the whole prop to the spread and silently drops
  // the component's own colour, font and flex.
  const written = opening.getAttributes();
  const styleIndex = styleAttribute ? written.indexOf(styleAttribute) : -1;
  const lastSpread = written.reduce(
    (last, attribute, index) => (Node.isJsxSpreadAttribute(attribute) ? index : last),
    -1,
  );

  if (lastSpread > styleIndex) {
    styleAttribute?.remove();
    opening.addAttribute({ name: "style", initializer: styleSource });
  } else if (styleAttribute) {
    styleAttribute.setInitializer(styleSource);
  } else {
    opening.addAttribute({ name: "style", initializer: styleSource });
  }

  for (const [group] of variantArguments) attributes.get(group)?.remove();
  for (const attribute of prepared.attributes) opening.addAttribute(attribute);

  // Before the tag swap: replacing the tag name re-parses the element, and the
  // handle we need to locate the render statement would go with it.
  if (host) mergeUseVariants(host, stylesName, variantArguments, use.node);

  if (prepared.mode === "inline") {
    opening.getTagNameNode().replaceWithText(prepared.element);
    if (Node.isJsxElement(use.node)) {
      use.node.getClosingElement().getTagNameNode().replaceWithText(prepared.element);
    }
    if (prepared.origin) ensureImport(file, module, prepared.origin);
  }
  // In wrapper mode the tag keeps its name — it now resolves to the
  // withUnistyles component the styles module exports in its place. The
  // rewrite loop recognises it as done by the `style` attribute we just added.
}

/**
 * What the call site's `style` prop already evaluates to, or `null` when it
 * has none. A written `style` contributes itself and a spread contributes its
 * own `style` member; the last one in source order is the whole prop, because
 * that is how JSX resolves a repeated name.
 */
function styleOverride(
  file: SourceFile,
  tag: string,
  opening: JsxOpeningElement | JsxSelfClosingElement,
): string | null {
  let override: string | null = null;

  for (const attribute of opening.getAttributes()) {
    if (Node.isJsxAttribute(attribute)) {
      if (attribute.getNameNode().getText() === "style") {
        override = readAttributeValue(attribute);
      }
      continue;
    }

    const spread = spreadStyle(file, tag, attribute.getExpression(), attribute.getExpression());
    if (spread) override = spread;
  }

  return override;
}

/**
 * How to read `style` back off a spread expression, or `null` when the spread
 * provably cannot carry one. Anything we cannot decide throws: guessing here
 * either drops the caller's override or drops the component's own styles, and
 * both are invisible until someone screenshots the app.
 */
function spreadStyle(file: SourceFile, tag: string, node: Node, whole: Node): string | null {
  if (Node.isParenthesizedExpression(node)) {
    return spreadStyle(file, tag, node.getExpression(), whole);
  }

  if (Node.isAsExpression(node) || Node.isSatisfiesExpression(node)) {
    return spreadStyle(file, tag, node.getExpression(), whole);
  }

  // `{...undefined}` and `{...null}` are legal and contribute nothing.
  if (node.getKind() === SyntaxKind.NullKeyword) return null;
  if (Node.isIdentifier(node) && node.getText() === "undefined") return null;

  // A literal says outright whether it writes `style`. A nested spread would
  // put that back in doubt, so it is not decidable here.
  if (Node.isObjectLiteralExpression(node)) {
    const properties = node.getProperties();
    if (properties.every(Node.isPropertyAssignment)) {
      const style = properties.find((property) => property.getName() === "style");
      if (!style) return null;
      const initializer = style.getInitializer();
      if (initializer) return initializer.getText();
    }
  }

  // Both arms of a ternary have to be innocent for the whole thing to be: a
  // single arm carrying `style` cannot be re-read without re-evaluating the
  // condition, which is not always free.
  if (Node.isConditionalExpression(node)) {
    const whenTrue = spreadStyle(file, tag, node.getWhenTrue(), whole);
    const whenFalse = spreadStyle(file, tag, node.getWhenFalse(), whole);
    if (!whenTrue && !whenFalse) return null;
  }

  // A plain reference is safe to read twice, so ask the checker whether it
  // even has a `style` to read. `props.style` on a props type that has none
  // would not compile.
  if (Node.isIdentifier(node) || isReferenceChain(node)) {
    const type = node.getType();
    if (type.isAny() || type.isUnknown()) {
      throw new UnsupportedError(
        `<${tag}> in ${rel(file)} spreads \`${whole.getText()}\`, whose type is not resolvable`,
      );
    }

    return type.getProperty("style") ? `${node.getText()}.style` : null;
  }

  throw new UnsupportedError(
    `<${tag}> in ${rel(file)} spreads \`${whole.getText()}\`, whose \`style\` cannot be resolved`,
  );
}

/** `a`, `a.b`, `a.b.c` — re-readable without re-running anything. */
function isReferenceChain(node: Node): boolean {
  if (Node.isIdentifier(node) || Node.isThisExpression(node)) return true;
  if (!Node.isPropertyAccessExpression(node)) return false;
  return !node.hasQuestionDotToken() && isReferenceChain(node.getExpression());
}

type HostBlock = ReturnType<typeof enclosingBlock>;

/**
 * `useVariants` applies to the whole stylesheet, so a component that renders
 * several variant-bearing styles needs one merged call, not one per element.
 *
 * It goes immediately before the statement that renders — not at the top of the
 * function. The variant values are usually locals (`const active = …`), and
 * hoisting the call above them would read them in their temporal dead zone.
 */
function mergeUseVariants(
  host: HostBlock,
  stylesName: string,
  variantArguments: readonly (readonly [string, string])[],
  element: Node,
): void {
  const statements = host.getStatements();
  const prefix = `${stylesName}.useVariants(`;

  const target = Math.max(
    statements.findIndex(
      (statement) =>
        statement.getStart() <= element.getStart() && element.getEnd() <= statement.getEnd(),
    ),
    0,
  );

  const body = variantArguments
    .map(([group, value]) => (group === value ? group : `${group}: ${value}`))
    .join(", ");

  const existing = statements.find((statement) => statement.getText().startsWith(prefix));
  if (!existing) {
    host.insertStatements(target, `${stylesName}.useVariants({ ${body} });`);
    return;
  }

  const object = existing.getFirstDescendantByKind(SyntaxKind.ObjectLiteralExpression);
  if (!object) throw new Error("useVariants call lost its argument object");

  const present = new Set(object.getProperties().map((property) => property.getName?.()));
  for (const [group, value] of variantArguments) {
    if (!present.has(group)) object.addPropertyAssignment({ name: group, initializer: value });
  }

  // Elements are not converted in document order, so an earlier render
  // statement can show up after the call was already placed.
  const index = statements.indexOf(existing);
  if (target < index) {
    const text = existing.getText();
    existing.remove();
    host.insertStatements(target, text);
  }
}

interface JsxUse {
  tag: string;
  prepared: PreparedDefinition;
  node: JsxSelfClosingElement | JsxElement;
}

function collectJsx(file: SourceFile, tags: Tags): JsxUse[] {
  const uses: JsxUse[] = [];

  for (const node of file.getDescendantsOfKind(SyntaxKind.JsxSelfClosingElement)) {
    const tag = node.getTagNameNode().getText();
    const prepared = tags.get(tag);
    if (prepared) uses.push({ tag, prepared, node });
  }

  for (const node of file.getDescendantsOfKind(SyntaxKind.JsxElement)) {
    const tag = node.getOpeningElement().getTagNameNode().getText();
    const prepared = tags.get(tag);
    if (prepared) uses.push({ tag, prepared, node });
  }

  return uses;
}

const openingOf = (node: JsxSelfClosingElement | JsxElement) =>
  Node.isJsxElement(node) ? node.getOpeningElement() : node;

/** Wrapper-mode tags keep their name, so the injected style is the marker. */
function isConverted(use: JsxUse, stylesName: string): boolean {
  if (use.prepared.mode === "inline") return false;
  const attribute = openingOf(use.node)
    .getAttributes()
    .find(
      (candidate) =>
        Node.isJsxAttribute(candidate) && candidate.getNameNode().getText() === "style",
    );
  return attribute?.getText().includes(`${stylesName}.${use.prepared.key}`) ?? false;
}

const isInsideImport = (node: Node) =>
  node.getFirstAncestorByKind(SyntaxKind.ImportDeclaration) !== undefined;

function isMemberName(node: Node): boolean {
  const parent = node.getParent();
  if (Node.isPropertyAccessExpression(parent)) return parent.getNameNode() === node;
  if (Node.isQualifiedName(parent)) return parent.getRight() === node;
  if (Node.isJsxAttribute(parent)) return parent.getNameNode() === node;
  if (Node.isPropertyAssignment(parent)) return parent.getNameNode() === node;
  if (Node.isPropertySignature(parent)) return parent.getNameNode() === node;
  return false;
}

function isJsxTagName(node: Node): boolean {
  const parent = node.getParent();
  return (
    (Node.isJsxSelfClosingElement(parent) ||
      Node.isJsxOpeningElement(parent) ||
      Node.isJsxClosingElement(parent)) &&
    parent.getTagNameNode() === node
  );
}

function readAttributeValue(attribute: JsxAttribute): string {
  const initializer = attribute.getInitializer();
  if (!initializer) return "true";
  if (Node.isStringLiteral(initializer)) return JSON.stringify(initializer.getLiteralValue());
  if (Node.isJsxExpression(initializer)) {
    const expression = initializer.getExpression();
    if (expression) return expression.getText();
  }
  throw new UnsupportedError(`cannot read the value of \`${attribute.getText()}\``);
}

/** The function body that should call `useVariants` before rendering. */
function enclosingBlock(file: SourceFile, node: Node, tag: string) {
  const fn = node.getFirstAncestor(
    (ancestor) =>
      Node.isArrowFunction(ancestor) ||
      Node.isFunctionDeclaration(ancestor) ||
      Node.isFunctionExpression(ancestor),
  ) as { getBody?: () => Node | undefined } | undefined;

  const body = fn?.getBody?.();
  if (!body || !Node.isBlock(body)) {
    throw new UnsupportedError(
      `<${tag}> in ${rel(file)} needs useVariants but is not inside a function with a block body`,
    );
  }
  return body;
}

/* -- imports -------------------------------------------------------------- */

function addStylesImport(file: SourceFile, declaration: ImportDeclaration): string {
  const taken = boundNames(file);

  let local = preferredStylesName(declaration.getModuleSpecifierValue());
  let suffix = 2;
  while (taken.has(local)) local = `${local.replace(/\d+$/, "")}${suffix++}`;

  const structure = local === "styles" ? "styles" : { name: "styles", alias: local };

  // `import * as S, { styles }` is not valid syntax, so a namespace consumer
  // gets its own declaration.
  if (declaration.getNamespaceImport()) {
    file.addImportDeclaration({
      moduleSpecifier: declaration.getModuleSpecifierValue(),
      namedImports: [structure],
    });
  } else {
    declaration.addNamedImport(structure);
  }

  return local;
}

/**
 * A component's own `./styles` gets the plain name; anything borrowed from
 * another component is named after it, so `styles` vs `styles2` never becomes a
 * puzzle at the call site.
 */
function preferredStylesName(specifier: string): string {
  if (/^\.+\/styles$/.test(specifier)) return "styles";

  const owner = specifier.split("/").at(-2);
  if (!owner) return "styles";

  const camel = owner
    .replace(/[^A-Za-z0-9]+(.)?/g, (_, next: string | undefined) => next?.toUpperCase() ?? "")
    .replace(/^./, (first) => first.toLowerCase());

  return camel ? `${camel}Styles` : "styles";
}

function ensureImport(file: SourceFile, module: CollectedModule, origin: ImportOrigin): void {
  const specifier = rewriteSpecifier(module.file, file, origin.moduleSpecifier);
  releaseTypeOnlyBinding(file, origin.name);

  const existing = file
    .getImportDeclarations()
    .find(
      (declaration) =>
        declaration.getModuleSpecifierValue() === specifier && !declaration.isTypeOnly(),
    );

  if (origin.kind === "named") {
    if (existing) {
      const already = existing
        .getNamedImports()
        .some((named) => (named.getAliasNode()?.getText() ?? named.getName()) === origin.name);
      if (!already) existing.addNamedImport(origin.name);
      return;
    }
    file.addImportDeclaration({ moduleSpecifier: specifier, namedImports: [origin.name] });
    return;
  }

  const bound =
    origin.kind === "default"
      ? existing?.getDefaultImport()?.getText()
      : existing?.getNamespaceImport()?.getText();
  if (bound === origin.name) return;

  if (existing && !bound && existing.getNamedImports().length === 0) {
    if (origin.kind === "default") existing.setDefaultImport(origin.name);
    else existing.setNamespaceImport(origin.name);
    return;
  }
  if (existing && !bound && origin.kind === "default") {
    existing.setDefaultImport(origin.name);
    return;
  }

  file.addImportDeclaration(
    origin.kind === "default"
      ? { moduleSpecifier: specifier, defaultImport: origin.name }
      : { moduleSpecifier: specifier, namespaceImport: origin.name },
  );
}

/**
 * Drops a `import type { TextInput }` binding so the same name can come back as
 * a value import. TypeScript is happy to use a value import in type positions,
 * so nothing is lost — but the two spellings cannot coexist.
 */
function releaseTypeOnlyBinding(file: SourceFile, name: string): void {
  for (const declaration of [...file.getImportDeclarations()]) {
    // Same trap as in `pruneUnusedImports`: `import "@/config";` has no clause,
    // so it falls straight through to the empty-clause check at the bottom and
    // gets deleted even though this pass has no business touching it.
    if (!declaration.getImportClause()) continue;

    const wholeDeclarationIsType = declaration.isTypeOnly();

    for (const specifier of [...declaration.getNamedImports()]) {
      if ((specifier.getAliasNode()?.getText() ?? specifier.getName()) !== name) continue;
      if (!wholeDeclarationIsType && !specifier.isTypeOnly()) continue;
      specifier.remove();
    }

    const defaultImport = declaration.getDefaultImport();
    if (wholeDeclarationIsType && defaultImport?.getText() === name) {
      declaration.removeDefaultImport();
    }

    if (
      declaration.getNamedImports().length === 0 &&
      !declaration.getDefaultImport() &&
      !declaration.getNamespaceImport()
    ) {
      declaration.remove();
    }
  }
}

/** Re-points a relative specifier from the styles module to a consumer. */
function rewriteSpecifier(from: SourceFile, to: SourceFile, specifier: string): string {
  if (!specifier.startsWith(".")) return specifier;

  const absolute = path.resolve(path.dirname(from.getFilePath()), specifier);
  let next = path.relative(path.dirname(to.getFilePath()), absolute);
  if (!next.startsWith(".")) next = `./${next}`;
  return next;
}

/* -- styles module rewrite ------------------------------------------------ */

function applyStylesModule(
  module: CollectedModule,
  prepared: PreparedDefinition[],
  /** Whether another file imports this module's styles. */
  shared: boolean,
): void {
  const file = module.file;
  const wrappers = prepared.filter((item) => item.mode === "wrapper");

  // Every base a wrapper needs must be an identifier in this module. Primitives
  // were never imported here (`styled.View`), so bring them in — under an alias
  // when the definition already owns the name.
  const bases = new Map<string, string>();
  for (const item of wrappers) {
    bases.set(
      item.definition.name,
      item.primitiveTag ? importPrimitive(file, item.primitiveTag, prepared) : item.wrapped,
    );
  }

  const exported = new Map(
    prepared.map((item) => [item.definition.name, item.definition.statement.isExported()]),
  );

  for (const item of prepared) item.definition.statement.remove();
  for (const fragment of module.fragments) fragment.statement.remove();

  // The module may already have `StyleSheet` bound (a leftover react-native
  // sheet for `contentContainerStyle` and friends). Unistyles' babel plugin
  // reads the *local* name, so an alias is safe.
  const taken = boundNames(file);
  const styleSheet = freeName("StyleSheet", "UnistylesStyleSheet", taken);
  const withUni = freeName("withUnistyles", "unistylesWrapper", taken);

  // Appended, never inserted: `StyleSheet.create` runs at module evaluation, so
  // every constant it reads has to already be initialised.
  file.addStatements(`\n${emitStyleSheet(prepared, styleSheet, shared)}`);

  let usesWithUnistyles = false;

  for (const item of wrappers) {
    const base = bases.get(item.definition.name)!;
    const keyword = exported.get(item.definition.name) ? "export const" : "const";

    if (!item.mapper && isSheetMergingBase(item)) {
      file.addStatements(`\n${keyword} ${item.definition.name} = ${base};\n`);
      continue;
    }

    usesWithUnistyles = true;
    const mapper = item.mapper ? `, ${item.mapper}` : "";
    file.addStatements(
      `\n${keyword} ${item.definition.name} = ${withUni}(${base}${mapper});\n`,
    );
  }

  // Only `styled` and `css` go; the module may also export `useTheme`, which a
  // later pass converts, and removing the whole line would strand it.
  for (const declaration of [...file.getImportDeclarations()]) {
    if (declaration.getModuleSpecifierValue() !== STYLED_MODULE) continue;
    declaration.removeDefaultImport();
    for (const specifier of [...declaration.getNamedImports()]) {
      if (specifier.getName() === "css") specifier.remove();
    }

    // Dropped here rather than left to `pruneUnusedImports`, which now reads a
    // clause-less declaration as a deliberate side-effect import and keeps it.
    // This one is a leftover, not a side effect: it is only empty because the
    // two lines above emptied it.
    if (
      declaration.getNamedImports().length === 0 &&
      !declaration.getDefaultImport() &&
      !declaration.getNamespaceImport()
    ) {
      declaration.remove();
    }
  }

  const names = [namedImport("StyleSheet", styleSheet)];
  if (usesWithUnistyles) names.push(namedImport("withUnistyles", withUni));
  file.insertStatements(0, `import { ${names.join(", ")} } from "${UNISTYLES_MODULE}";\n`);
  pruneUnusedImports(file);
  pruneUnusedTypes(file);
  separateImports(file);
}

/**
 * Bases that end the migration as `<Autoprocessed {...props} style={[ownSheet,
 * style]} />` — a component that puts its own Unistyles sheet and whatever the
 * caller hands it on the *same* react-native node.
 *
 * `withUnistyles` must not sit in front of one of those. It resolves the
 * caller's sheet reference in JS (`uni__getStyles()`) and passes a plain
 * object down, so the node ends up holding one real Unistyle and one anonymous
 * object. `unistyleFromValue` turns the anonymous half into an EXOTIC
 * Unistyle whose `UnistyleData::parsedStyle` starts empty, and only
 * `Parser::rebuildUnistylesInDependencyMap` ever fills it in. Every other
 * commit path — `HybridShadowRegistry::link` for a family that came back from
 * `suspend` (what a screen going Offscreen does, so any navigation away and
 * back), and `flush` — builds its props straight from
 * `parseStylesToShadowTreeStyles`, which skips any `UnistyleData` without a
 * `parsedStyle`. The commit then carries only the base sheet, and because it
 * lands in `nativeProps_DEPRECATED` (which merges and persists) the caller's
 * declaration is gone for good on that node. That is the chat timestamp
 * rendering `colors.text` at full opacity instead of `Color(text).alpha(0.5)`,
 * on one row, on some runs.
 *
 * Aliasing instead of wrapping keeps the caller's style a real Unistyle:
 * `Text` receives `styles.time` itself, renders `[styles.text, styles.time]`,
 * `UnistylesShadowRegistry.add` flattens that to two registry-backed styles,
 * no exotic is created, and both halves re-derive on a theme change. The
 * `withUnistyles` theme subscription is not lost either — it was redundant,
 * because both sheets already carry the Theme dependency.
 *
 * Only bases with no `.attrs` mapper qualify: a mapper turns theme values into
 * *props*, which only `withUnistyles` can do.
 *
 * To extend this list, check what the converted base renders. A base that
 * forwards into another `withUnistyles` (`blur-view`'s `BlurView`,
 * `Button`, `Glassmorphism`) is already safe — that wrapper flattens the whole
 * array into one object, so the node holds an exotic and nothing else.
 *
 * Three bases do qualify and are deliberately not here yet:
 * `FeedbackCard/components/LikeFeedback/styles#Container` and
 * `DefaultModal/styles#Container` (both `<View {...props} style={[styles
 * .container, style]} />`) and `components/Input#Input` (`<View {...props}
 * style={[styles.content, props.style]}>`). All three are produced by hand
 * patches rather than by this transform, so the rule below cannot reach them,
 * and `Input`'s style plumbing was rewritten in 01b99fb. They need their own
 * patch edits, not an entry here.
 */
const SHEET_MERGING_BASES = new Map<string, string>([["@/components/text", "Text"]]);

function isSheetMergingBase(item: PreparedDefinition): boolean {
  const origin = item.origin;
  if (!origin || origin.kind !== "named") return false;

  return SHEET_MERGING_BASES.get(origin.moduleSpecifier) === item.wrapped;
}

/**
 * `type IDot = { active: boolean }` existed only to type a styled component's
 * props. With the component gone it is dead, and a local dead type is a lint
 * error. Exported ones stay — they are part of the module's contract.
 */
function pruneUnusedTypes(file: SourceFile): void {
  const declarations = [...file.getTypeAliases(), ...file.getInterfaces()];

  for (const declaration of declarations) {
    if (declaration.isExported()) continue;

    const name = declaration.getName();
    const referenced = file
      .getDescendantsOfKind(SyntaxKind.Identifier)
      .some(
        (identifier) =>
          identifier.getText() === name && identifier.getParent() !== declaration,
      );

    if (!referenced) declaration.remove();
  }
}

/** `import/newline-after-import` wants a blank line before the first statement. */
export function separateImports(file: SourceFile): void {
  const imports = file.getImportDeclarations();
  const last = imports.at(-1);
  if (!last) return;

  const next = file.getStatements()[last.getChildIndex() + 1];
  if (!next || Node.isImportDeclaration(next)) return;

  const between = file.getFullText().slice(last.getEnd(), next.getStart());
  if (!/\n\s*\n/.test(between)) next.prependWhitespace("\n");
}

const namedImport = (name: string, local: string) =>
  name === local ? name : `${name} as ${local}`;

const freeName = (preferred: string, fallback: string, taken: Set<string>) =>
  taken.has(preferred) ? fallback : preferred;

/** Every name already bound at module scope — imports and declarations alike. */
function boundNames(file: SourceFile): Set<string> {
  const names = new Set<string>();

  for (const declaration of file.getImportDeclarations()) {
    for (const specifier of declaration.getNamedImports()) {
      names.add(specifier.getAliasNode()?.getText() ?? specifier.getName());
    }
    const defaultImport = declaration.getDefaultImport();
    if (defaultImport) names.add(defaultImport.getText());
    const namespaceImport = declaration.getNamespaceImport();
    if (namespaceImport) names.add(namespaceImport.getText());
  }

  for (const declaration of file.getVariableDeclarations()) {
    for (const identifier of declaration.getNameNode().getDescendantsOfKind(SyntaxKind.Identifier)) {
      names.add(identifier.getText());
    }
    if (Node.isIdentifier(declaration.getNameNode())) names.add(declaration.getName());
  }

  for (const declaration of file.getFunctions()) {
    const name = declaration.getName();
    if (name) names.add(name);
  }
  for (const declaration of file.getClasses()) {
    const name = declaration.getName();
    if (name) names.add(name);
  }

  return names;
}

/** Adds `import { View } from "react-native"`, aliased if the name is taken. */
function importPrimitive(
  file: SourceFile,
  tag: string,
  prepared: PreparedDefinition[],
): string {
  const taken = new Set(prepared.map((item) => item.definition.name));
  const existing = findImportOrigin(file, tag);
  if (existing?.moduleSpecifier === RN_MODULE && !taken.has(tag)) return tag;

  let local = taken.has(tag) ? `RN${tag}` : tag;
  let suffix = 2;
  while (taken.has(local) || findImportOrigin(file, local)) local = `RN${tag}${suffix++}`;

  const declaration = file
    .getImportDeclarations()
    .find((candidate) => candidate.getModuleSpecifierValue() === RN_MODULE && !candidate.isTypeOnly());

  if (declaration) declaration.addNamedImport(local === tag ? tag : { name: tag, alias: local });
  else {
    file.addImportDeclaration({
      moduleSpecifier: RN_MODULE,
      namedImports: [local === tag ? tag : { name: tag, alias: local }],
    });
  }

  return local;
}

function pruneUnusedImports(file: SourceFile): void {
  const isUsed = (name: string) =>
    file
      .getDescendantsOfKind(SyntaxKind.Identifier)
      .some((identifier) => identifier.getText() === name && !isInsideImport(identifier));

  for (const declaration of [...file.getImportDeclarations()]) {
    if (declaration.getModuleSpecifierValue() === UNISTYLES_MODULE) continue;

    // `import "@/config";` binds nothing, so every "is this binding still
    // referenced?" test below answers no and the trailing empty-clause check
    // deletes the line. A side-effect import is the one kind of import whose
    // whole point is that nothing references it: `@/config` is what installs
    // `react-native-get-random-values`, and without it `uuid`'s v4 throws
    // "crypto.getRandomValues() not supported" the first time chat send calls
    // it. Nothing in the module graph can tell us whether the side effect is
    // still wanted, so it is never ours to drop.
    if (!declaration.getImportClause()) continue;

    for (const specifier of [...declaration.getNamedImports()]) {
      const local = specifier.getAliasNode()?.getText() ?? specifier.getName();
      if (!isUsed(local)) specifier.remove();
    }

    const defaultImport = declaration.getDefaultImport();
    if (defaultImport && !isUsed(defaultImport.getText())) declaration.removeDefaultImport();

    const namespaceImport = declaration.getNamespaceImport();
    if (namespaceImport && !isUsed(namespaceImport.getText())) declaration.removeNamespaceImport();

    if (
      declaration.getNamedImports().length === 0 &&
      !declaration.getDefaultImport() &&
      !declaration.getNamespaceImport()
    ) {
      declaration.remove();
    }
  }
}

/* -- misc ----------------------------------------------------------------- */

export function rel(file: SourceFile): string {
  return path.relative(process.cwd(), file.getFilePath());
}
