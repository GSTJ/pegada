/**
 * The parity ledger, pointed at modules the transform *skipped*.
 *
 *   tsx src/parity-manual.ts [git-ref]
 *
 * `parity.ts` reads `report.json`, so it only ever checks what the codemod
 * itself converted. The skipped modules (inheritance roots, prop spreads,
 * two-branch conditionals) are converted by hand, and they are exactly the ones
 * worth proving: everything else in the app inherits from them.
 *
 * Each batch drops a `manual/NN-<slug>.json` describing what it emitted —
 * definition name, the sheet key it landed on, its variant buckets — and this
 * runs the same `checkParity` the automated gate does over the lot. Splitting
 * the input per file keeps parallel batches from fighting over one JSON.
 *
 * A unit may name a `pristine` path: the hand conversions rename `styles.ts` to
 * `styles.tsx` when they emit a component, and the pre-migration source still
 * lives at the old path in git.
 */

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { checkParity, type DefinitionInfo, type ParityReport } from "./ledger.ts";

interface ManualUnit {
  file: string;
  /** Where the pre-migration source lives in `ref`, when the file was renamed. */
  pristine?: string;
  definitionsDetail: DefinitionInfo[];
}

interface ManualBatch {
  /** The last commit before the migration, for batches that predate a rename. */
  pristineRef?: string;
  units: ManualUnit[];
}

const here = path.dirname(fileURLToPath(import.meta.url));
const codemodRoot = path.resolve(here, "..");
const repoRoot = path.resolve(codemodRoot, "..");
const manualRoot = path.join(codemodRoot, "manual");

if (!fs.existsSync(manualRoot)) {
  console.log("[parity:manual] no manual/ directory — nothing to check");
  process.exit(0);
}

const batches = fs
  .readdirSync(manualRoot)
  .filter((entry) => entry.endsWith(".json"))
  .sort()
  .map((entry) => JSON.parse(fs.readFileSync(path.join(manualRoot, entry), "utf8")) as ManualBatch);

const units = batches.flatMap((batch) => batch.units);
const refs = new Map(
  batches.flatMap((batch) => batch.units.map((unit) => [unit.file, batch.pristineRef])),
);
const pristinePaths = new Map(units.map((unit) => [unit.file, unit.pristine ?? unit.file]));

const cliRef = process.argv[2];

const pristine = (file: string) =>
  execFileSync("git", ["show", `${cliRef ?? refs.get(file) ?? "HEAD"}:${pristinePaths.get(file) ?? file}`], {
    cwd: repoRoot,
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  });

const parity: ParityReport = checkParity(repoRoot, units, pristine);

fs.writeFileSync(
  path.join(codemodRoot, "parity-manual-report.json"),
  `${JSON.stringify(parity, null, 2)}\n`,
);

const { totals } = parity;
console.log(
  `[parity:manual] ${totals.comparisons - totals.failures}/${totals.comparisons} comparisons match ` +
    `across ${totals.definitions} definitions in ${totals.modules} modules`,
);

for (const module of parity.modules) {
  if (module.status === "unverifiable") {
    console.error(`[parity:manual] UNVERIFIABLE ${module.file} — ${module.reason}`);
  }

  for (const check of module.checks) {
    if (check.status === "pass") continue;
    console.error(
      `[parity:manual] FAIL ${module.file} ${check.definition} [${check.theme}] ${check.props}`,
    );
    for (const diff of check.diffs ?? []) {
      console.error(
        `           ${diff.property}: styled-components ${JSON.stringify(diff.expected)} ` +
          `vs unistyles ${JSON.stringify(diff.actual)}`,
      );
    }
  }
}

if (totals.failures > 0 || totals.unverifiable > 0) {
  console.error(
    `\n[parity:manual] ${totals.failures} mismatch(es), ${totals.unverifiable} unverifiable module(s)`,
  );
  process.exit(1);
}

console.log("[parity:manual] clean");
