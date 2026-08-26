/**
 * Reads a `styles.ts` module and describes every `styled…` definition in it,
 * without deciding anything about whether it can be converted. Classification
 * lives in `classify.ts`, emission in `emit.ts`.
 */

import type { ArrowFunction, ObjectLiteralExpression, SourceFile, VariableStatement } from "ts-morph";

import { Node, SyntaxKind, type Expression, type TaggedTemplateExpression } from "ts-morph";


/** `styled.View` — the tag maps onto a react-native export of the same name. */
export type Base =
  | { kind: "primitive"; tag: string }
  /** `styled(PressableArea)` — some component identifier in scope. */
  | { kind: "component"; expression: string; rootIdentifier: string | null };

export interface StyledDefinition {
  name: string;
  statement: VariableStatement;
  tagged: TaggedTemplateExpression;
  base: Base;
  attrs: ObjectLiteralExpression | ArrowFunction | Expression | null;
  /** `styled.Text<TextProps>` */
  typeArguments: string[];
  quasis: string[];
  interpolations: Expression[];
}

export interface CssFragment {
  name: string;
  statement: VariableStatement;
  quasis: string[];
  interpolations: Expression[];
}

export interface CollectedModule {
  file: SourceFile;
  styledImport: string | null;
  definitions: StyledDefinition[];
  fragments: CssFragment[];
  /** Definitions we found the shape of but could not even parse structurally. */
  malformed: { name: string; reason: string }[];
}

const STYLED_MODULE = "styled-components/native";

export function collectModule(file: SourceFile): CollectedModule {
  const definitions: StyledDefinition[] = [];
  const fragments: CssFragment[] = [];
  const malformed: { name: string; reason: string }[] = [];

  const styledImport = findStyledLocalName(file);
  const cssImport = findCssLocalName(file);

  for (const statement of file.getVariableStatements()) {
    const declarations = statement.getDeclarations();
    if (declarations.length !== 1) continue;

    const declaration = declarations[0]!;
    const initializer = declaration.getInitializer();
    if (!Node.isTaggedTemplateExpression(initializer)) continue;

    const name = declaration.getName();
    const { quasis, interpolations } = readTemplate(initializer);

    if (cssImport && initializer.getTag().getText() === cssImport) {
      fragments.push({ name, statement, quasis, interpolations });
      continue;
    }

    if (!styledImport) continue;
    if (!initializer.getTag().getText().startsWith(styledImport)) continue;

    const parsed = parseTag(initializer, styledImport);
    if ("reason" in parsed) {
      malformed.push({ name, reason: parsed.reason });
      continue;
    }

    definitions.push({
      name,
      statement,
      tagged: initializer,
      base: parsed.base,
      attrs: parsed.attrs,
      typeArguments: (initializer.compilerNode.typeArguments ?? []).map((argument) =>
        argument.getText(),
      ),
      quasis,
      interpolations,
    });
  }

  // `export default styled.View\`…\`` has no name to key a style on and no
  // named export for a call site to swap; it needs a human to pick one.
  if (styledImport) {
    for (const assignment of file.getDescendantsOfKind(SyntaxKind.ExportAssignment)) {
      const expression = assignment.getExpression();
      if (
        Node.isTaggedTemplateExpression(expression) &&
        expression.getTag().getText().startsWith(styledImport)
      ) {
        malformed.push({
          name: "default export",
          reason: "the styled component is the module's default export, so it has no name",
        });
      }
    }
  }

  return { file, styledImport, definitions, fragments, malformed };
}

/* -- imports -------------------------------------------------------------- */

// A module often imports styled-components twice — once for the types, once for
// `styled` itself — so every declaration has to be considered, not just the
// first one that matches the specifier.
function styledImportDeclarations(file: SourceFile) {
  return file
    .getImportDeclarations()
    .filter((declaration) => declaration.getModuleSpecifierValue() === STYLED_MODULE);
}

function findStyledLocalName(file: SourceFile): string | null {
  for (const declaration of styledImportDeclarations(file)) {
    const defaultImport = declaration.getDefaultImport();
    if (defaultImport) return defaultImport.getText();
  }
  return null;
}

function findCssLocalName(file: SourceFile): string | null {
  for (const declaration of styledImportDeclarations(file)) {
    const named = declaration.getNamedImports().find((specifier) => specifier.getName() === "css");
    if (named) return named.getAliasNode()?.getText() ?? named.getName();
  }
  return null;
}

/* -- tag parsing ---------------------------------------------------------- */

type ParsedTag =
  | { base: Base; attrs: StyledDefinition["attrs"] }
  | { reason: string };

/**
 * Unwraps `styled.View`, `styled(X)`, and either of those followed by
 * `.attrs(...)`, into a base plus the raw attrs argument.
 */
function parseTag(tagged: TaggedTemplateExpression, styledName: string): ParsedTag {
  let node: Node = tagged.getTag();
  let attrs: StyledDefinition["attrs"] = null;

  if (Node.isCallExpression(node)) {
    const callee = node.getExpression();
    if (Node.isPropertyAccessExpression(callee) && callee.getName() === "attrs") {
      const args = node.getArguments();
      if (args.length !== 1) return { reason: ".attrs() takes an unexpected number of arguments" };
      attrs = args[0] as Expression;
      node = callee.getExpression();
    }
  }

  if (Node.isPropertyAccessExpression(node)) {
    if (node.getExpression().getText() !== styledName) {
      return { reason: `unrecognised styled tag \`${node.getText()}\`` };
    }
    return { base: { kind: "primitive", tag: node.getName() }, attrs };
  }

  if (Node.isCallExpression(node)) {
    if (node.getExpression().getText() !== styledName) {
      return { reason: `unrecognised styled tag \`${node.getText()}\`` };
    }
    const args = node.getArguments();
    if (args.length !== 1) return { reason: "styled() takes an unexpected number of arguments" };
    const expression = args[0]!;
    return {
      base: {
        kind: "component",
        expression: expression.getText(),
        rootIdentifier: rootIdentifierOf(expression),
      },
      attrs,
    };
  }

  return { reason: `unrecognised styled tag \`${node.getText()}\`` };
}

/** `Animated.View` → `Animated`; `PressableArea` → `PressableArea`. */
function rootIdentifierOf(node: Node): string | null {
  let current: Node = node;
  while (Node.isPropertyAccessExpression(current)) current = current.getExpression();
  return Node.isIdentifier(current) ? current.getText() : null;
}

/* -- templates ------------------------------------------------------------ */

function readTemplate(tagged: TaggedTemplateExpression) {
  const template = tagged.getTemplate();

  if (Node.isNoSubstitutionTemplateLiteral(template)) {
    return { quasis: [template.getLiteralText()], interpolations: [] as Expression[] };
  }

  const head = template.asKindOrThrow(SyntaxKind.TemplateExpression);
  const quasis = [head.getHead().getLiteralText()];
  const interpolations: Expression[] = [];

  for (const span of head.getTemplateSpans()) {
    interpolations.push(span.getExpression());
    quasis.push(span.getLiteral().getLiteralText());
  }

  return { quasis, interpolations };
}

export { readTemplate };
