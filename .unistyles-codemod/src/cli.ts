/**
 * Drives the transform over apps/mobile and writes a machine-readable report.
 *
 *   tsx src/cli.ts analyze     # classify only, touch nothing
 *   tsx src/cli.ts transform   # classify and write
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { Node, Project, SyntaxKind, type SourceFile } from "ts-morph";

import { rewriteUseTheme, type UseThemeResult } from "./use-theme.ts";
import { transformUnit, type UnitResult } from "./unit.ts";

const here = path.dirname(fileURLToPath(import.meta.url));
const codemodRoot = path.resolve(here, "..");
const repoRoot = path.resolve(codemodRoot, "..");
const mobileRoot = path.join(repoRoot, "apps", "mobile");

const STYLED_MODULE = "styled-components/native";

export interface Report {
  units: UnitResult[];
  useTheme: UseThemeResult[];
  totals: {
    styleModules: number;
    converted: number;
    skipped: number;
    definitions: number;
    variantGroups: number;
    consumersTouched: number;
  };
}

export function createProject(): Project {
  return new Project({
    tsConfigFilePath: path.join(mobileRoot, "tsconfig.json"),
    skipAddingFilesFromTsConfig: false,
  });
}

/**
 * Definitions another module wraps with `styled(...)`. Converting one of those
 * would break its wrapper, so the whole unit is left alone.
 */
export function collectExternalBases(project: Project): Set<string> {
  const bases = new Set<string>();

  for (const file of project.getSourceFiles()) {
    const styled = file
      .getImportDeclarations()
      .find((declaration) => declaration.getModuleSpecifierValue() === STYLED_MODULE)
      ?.getDefaultImport()
      ?.getText();
    if (!styled) continue;

    for (const call of file.getDescendantsOfKind(SyntaxKind.CallExpression)) {
      if (call.getExpression().getText() !== styled) continue;
      const argument = call.getArguments()[0];
      if (!argument) continue;

      const target = resolveExport(file, argument);
      if (target) bases.add(target);
    }
  }

  return bases;
}

/** `LikeFeedbackStyles.Container` / `Container` → "<absolute path>#Container". */
function resolveExport(file: SourceFile, node: Node): string | null {
  if (Node.isPropertyAccessExpression(node)) {
    const namespace = node.getExpression().getText();
    const declaration = file
      .getImportDeclarations()
      .find((candidate) => candidate.getNamespaceImport()?.getText() === namespace);
    const source = declaration?.getModuleSpecifierSourceFile();
    return source ? `${source.getFilePath()}#${node.getName()}` : null;
  }

  if (!Node.isIdentifier(node)) return null;

  for (const declaration of file.getImportDeclarations()) {
    for (const specifier of declaration.getNamedImports()) {
      const local = specifier.getAliasNode()?.getText() ?? specifier.getName();
      if (local !== node.getText()) continue;
      const source = declaration.getModuleSpecifierSourceFile();
      return source ? `${source.getFilePath()}#${specifier.getName()}` : null;
    }
  }

  return null;
}

export function styleModules(project: Project): SourceFile[] {
  return project
    .getSourceFiles()
    .filter((file) => file.getFilePath().startsWith(`${mobileRoot}/src/`))
    .filter((file) =>
      file
        .getImportDeclarations()
        .some(
          (declaration) =>
            declaration.getModuleSpecifierValue() === STYLED_MODULE &&
            declaration.getDefaultImport() !== undefined,
        ),
    )
    .sort((a, b) => a.getFilePath().localeCompare(b.getFilePath()));
}

export function run(write: boolean): Report {
  const project = createProject();
  const externalBases = collectExternalBases(project);

  // `ignored` results stay in the report on purpose: a module the codemod had
  // no opinion about is still a module someone has to look at by hand.
  const units = styleModules(project).map((file) =>
    transformUnit(project, file, externalBases),
  );

  const useTheme = rewriteUseTheme(project, repoRoot);

  if (write) project.saveSync();

  const converted = units.filter((unit) => unit.status === "converted");
  const consumers = new Set(converted.flatMap((unit) => unit.consumers ?? []));

  return {
    units,
    useTheme,
    totals: {
      styleModules: units.length,
      converted: converted.length,
      skipped: units.filter((unit) => unit.status !== "converted").length,
      definitions: converted.reduce((total, unit) => total + (unit.definitions ?? 0), 0),
      variantGroups: converted.reduce((total, unit) => total + (unit.variants ?? 0), 0),
      consumersTouched: consumers.size,
    },
  };
}

function main(): void {
  const command = process.argv[2] ?? "analyze";
  if (command !== "analyze" && command !== "transform") {
    console.error(`unknown command "${command}"; expected analyze or transform`);
    process.exit(2);
  }

  const report = run(command === "transform");
  const target = path.join(codemodRoot, "report.json");
  fs.writeFileSync(target, `${JSON.stringify(report, null, 2)}\n`);

  const { totals } = report;
  console.log(
    `${command}: ${totals.converted}/${totals.styleModules} style modules converted ` +
      `(${totals.definitions} definitions, ${totals.variantGroups} variant groups, ` +
      `${totals.consumersTouched} call-site files), ` +
      `${report.useTheme.filter((entry) => entry.status === "converted").length} useTheme files`,
  );

  for (const unit of report.units) {
    if (unit.status !== "converted") console.log(`  ${unit.status} ${unit.file} — ${unit.reason}`);
  }

  console.log(`report → ${path.relative(repoRoot, target)}`);
}

if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) main();
