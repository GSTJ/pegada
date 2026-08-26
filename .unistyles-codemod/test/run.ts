/**
 * Snapshot tests for the transform.
 *
 * Each case is a real file from apps/mobile, copied into `fixtures/` with its
 * call sites, run through the same pipeline `apply.sh` uses, and diffed against
 * the committed output in `__snapshots__/`. Skips are snapshotted too — a
 * refusal is a result, and a case that silently starts converting is exactly the
 * regression this suite exists to catch.
 *
 *   npm test              # verify
 *   npm test -- --update  # rewrite the snapshots
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { Project, type SourceFile } from "ts-morph";

import { collectExternalBases } from "../src/cli.ts";
import { rewriteUseTheme } from "../src/use-theme.ts";
import { transformUnit } from "../src/unit.ts";

const here = path.dirname(fileURLToPath(import.meta.url));
const fixtures = path.join(here, "fixtures");
const snapshots = path.join(here, "..", "__snapshots__");

const update = process.argv.includes("--update");

interface Case {
  /** Directory under `fixtures/`. */
  name: string;
  /** The styles module inside it, relative to the case directory. */
  entry: string;
}

const CASES: Case[] = JSON.parse(fs.readFileSync(path.join(fixtures, "cases.json"), "utf8"));

/* ------------------------------------------------------------------------ */

const walk = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });

function runCase(testCase: Case): string {
  const root = path.join(fixtures, testCase.name);
  const project = new Project({
    useInMemoryFileSystem: false,
    compilerOptions: {
      jsx: 4 /* react-jsx */,
      target: 99,
      module: 199,
      moduleResolution: 100,
      strict: true,
      noEmit: true,
      baseUrl: root,
      paths: { "@/*": [`${root}/*`] },
      skipLibCheck: true,
    },
  });

  const files = walk(root)
    .filter((file) => /\.tsx?$/.test(file))
    .map((file) => project.addSourceFileAtPath(file));

  const entry = project.getSourceFileOrThrow(path.join(root, testCase.entry));
  const result = transformUnit(project, entry, collectExternalBases(project));
  const useTheme = rewriteUseTheme(project, root);

  const header = [
    `# ${testCase.name}`,
    "",
    `status: ${result.status}`,
    ...(result.reason ? [`reason: ${result.reason}`] : []),
    ...(result.status === "converted"
      ? [`definitions: ${result.definitions}`, `variant groups: ${result.variants}`]
      : []),
    ...useTheme.map((entry) => `useTheme: ${entry.file} (${entry.sites ?? 0} sites)`),
  ].join("\n");

  const bodies = files
    .slice()
    .sort((a, b) => a.getFilePath().localeCompare(b.getFilePath()))
    .map((file) => renderFile(root, file))
    .join("\n");

  return `${header}\n\n${bodies}`;
}

const renderFile = (root: string, file: SourceFile) =>
  [
    `--- ${path.relative(root, file.getFilePath())} ---`,
    "",
    file.getFullText().trimEnd(),
    "",
  ].join("\n");

/* ------------------------------------------------------------------------ */

let failures = 0;

fs.mkdirSync(snapshots, { recursive: true });

for (const testCase of CASES) {
  const target = path.join(snapshots, `${testCase.name}.snap`);
  let actual: string;

  try {
    actual = runCase(testCase);
  } catch (error) {
    failures += 1;
    console.error(`✗ ${testCase.name} — threw: ${(error as Error).message}`);
    continue;
  }

  if (update) {
    fs.writeFileSync(target, actual);
    console.log(`↻ ${testCase.name}`);
    continue;
  }

  if (!fs.existsSync(target)) {
    failures += 1;
    console.error(`✗ ${testCase.name} — no snapshot; run with --update`);
    continue;
  }

  const expected = fs.readFileSync(target, "utf8");
  if (expected === actual) {
    console.log(`✓ ${testCase.name}`);
    continue;
  }

  failures += 1;
  console.error(`✗ ${testCase.name}`);
  console.error(diff(expected, actual));
}

if (!update && failures > 0) {
  console.error(`\n${failures} of ${CASES.length} snapshots failed`);
  process.exit(1);
}

console.log(`\n${CASES.length} snapshots ${update ? "written" : "passed"}`);

/** Minimal line diff — enough to see what moved without a dependency. */
function diff(expected: string, actual: string): string {
  const left = expected.split("\n");
  const right = actual.split("\n");
  const out: string[] = [];

  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    if (left[index] === right[index]) continue;
    if (left[index] !== undefined) out.push(`    - ${left[index]}`);
    if (right[index] !== undefined) out.push(`    + ${right[index]}`);
  }

  return out.slice(0, 60).join("\n");
}
