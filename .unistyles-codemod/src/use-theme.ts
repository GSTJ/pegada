/**
 * `useTheme()` from styled-components → `useUnistyles().theme`.
 *
 * Both hooks hand back the same object (the ThemeProvider mirrors its resolved
 * theme into `UnistylesRuntime`), so this is a rename rather than a semantic
 * change — and it keeps a converted component reading its theme from the same
 * source its styles now come from.
 */

import {
  Node,
  SyntaxKind,
  type ImportSpecifier,
  type Project,
  type SourceFile,
} from "ts-morph";

import { separateImports } from "./unit.ts";

// `useTheme` is re-exported by both entry points and the app imports it from
// both: the native entry in most modules, the bare one in a handful (Marker,
// NewMatch, UpgradeWall and friends). Matching only the native specifier left
// those files importing a hook from a library the migration is removing, so
// both are in scope here.
const STYLED_MODULES = ["styled-components/native", "styled-components"];
const UNISTYLES_MODULE = "react-native-unistyles";

export interface UseThemeResult {
  file: string;
  status: "converted" | "skipped";
  reason?: string;
  sites?: number;
}

export function rewriteUseTheme(project: Project, relativeTo: string): UseThemeResult[] {
  const results: UseThemeResult[] = [];

  for (const file of project.getSourceFiles()) {
    const specifier = findUseThemeImport(file);
    if (!specifier) continue;

    const local = specifier.getAliasNode()?.getText() ?? "useTheme";
    const result = rewriteFile(file, local, relativeTo);
    if (result) results.push(result);
  }

  return results;
}

/**
 * The `useTheme` specifier, whichever styled-components entry point it came in
 * through. A module can import from both at once (`app-review.tsx` takes the
 * hook from the bare entry and `styled` from the native one), so the lookup is
 * keyed on the specifier we want rather than on the declaration.
 */
function findUseThemeImport(file: SourceFile): ImportSpecifier | undefined {
  for (const declaration of file.getImportDeclarations()) {
    if (!STYLED_MODULES.includes(declaration.getModuleSpecifierValue())) continue;
    const specifier = declaration
      .getNamedImports()
      .find((named) => named.getName() === "useTheme");
    if (specifier) return specifier;
  }
  return undefined;
}

function rewriteFile(file: SourceFile, local: string, relativeTo: string): UseThemeResult | null {
  const path = file.getFilePath().replace(`${relativeTo}/`, "");

  const calls = file
    .getDescendantsOfKind(SyntaxKind.CallExpression)
    .filter((call) => call.getExpression().getText() === local && call.getArguments().length === 0);

  if (calls.length === 0) return null;

  // `const theme = useTheme()` gets the tidy shape, `const { theme } =
  // useUnistyles()`. Every other position — a destructuring pattern straight
  // off the call, an argument, a member access — takes the generic swap below,
  // which reads the same in any expression slot.
  const plans: (() => void)[] = [];

  for (const call of calls) {
    const parent = call.getParent();

    if (
      Node.isVariableDeclaration(parent) &&
      parent.getInitializer() === call &&
      Node.isIdentifier(parent.getNameNode())
    ) {
      const binding = parent.getNameNode().getText();
      const pattern = binding === "theme" ? "{ theme }" : `{ theme: ${binding} }`;
      // One replacement, not two: rewriting the name node would forget the
      // declaration handle we would then need for the initializer.
      plans.push(() => parent.replaceWithText(`${pattern} = useUnistyles()`));
      continue;
    }

    plans.push(() => call.replaceWithText(`useUnistyles().theme`));
  }

  for (const plan of plans.reverse()) plan();

  swapImport(file);
  separateImports(file);
  return { file: path, status: "converted", sites: plans.length };
}

function swapImport(file: SourceFile): void {
  const specifier = findUseThemeImport(file)!;
  const declaration = specifier.getImportDeclaration();
  specifier.remove();

  if (
    declaration.getNamedImports().length === 0 &&
    !declaration.getDefaultImport() &&
    !declaration.getNamespaceImport()
  ) {
    declaration.remove();
  }

  const existing = file
    .getImportDeclarations()
    .find((candidate) => candidate.getModuleSpecifierValue() === UNISTYLES_MODULE);

  if (existing) {
    const already = existing
      .getNamedImports()
      .some((named) => named.getName() === "useUnistyles");
    if (!already) existing.addNamedImport("useUnistyles");
    return;
  }

  file.addImportDeclaration({
    moduleSpecifier: UNISTYLES_MODULE,
    namedImports: ["useUnistyles"],
  });
}
