/**
 * Runs the parity ledger over whatever the transform just wrote and fails
 * loudly on any mismatch.
 *
 *   tsx src/parity.ts [git-ref]
 *
 * The pristine side comes from git rather than from a backup copy, so this is
 * meaningful even after `apply.sh` has rewritten the working tree.
 */

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { checkParity, type ParityReport } from "./ledger.ts";

const here = path.dirname(fileURLToPath(import.meta.url));
const codemodRoot = path.resolve(here, "..");
const repoRoot = path.resolve(codemodRoot, "..");
const ref = process.argv[2] ?? "d22dbde4f2ab5c1cf1afa4abb045a0c1d3823239";

const reportPath = path.join(codemodRoot, "report.json");
if (!fs.existsSync(reportPath)) {
  console.error("[parity] no report.json — run the transform first");
  process.exit(2);
}

const report = JSON.parse(fs.readFileSync(reportPath, "utf8")) as {
  units: { file: string; status: string; definitionsDetail?: never }[];
};

const pristine = (file: string) =>
  execFileSync("git", ["show", `${ref}:${file}`], {
    cwd: repoRoot,
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  });

const parity: ParityReport = checkParity(
  repoRoot,
  report.units.filter((unit) => unit.status === "converted"),
  pristine,
);

fs.writeFileSync(
  path.join(codemodRoot, "parity-report.json"),
  `${JSON.stringify(parity, null, 2)}\n`,
);

const { totals } = parity;
console.log(
  `[parity] ${totals.comparisons - totals.failures}/${totals.comparisons} comparisons match ` +
    `across ${totals.definitions} definitions in ${totals.modules} modules`,
);

for (const module of parity.modules) {
  if (module.status === "unverifiable") {
    console.error(`[parity] UNVERIFIABLE ${module.file} — ${module.reason}`);
  }

  for (const check of module.checks) {
    if (check.status === "pass") continue;
    console.error(`[parity] FAIL ${module.file} ${check.definition} [${check.theme}] ${check.props}`);
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
    `\n[parity] ${totals.failures} mismatch(es), ${totals.unverifiable} unverifiable module(s)`,
  );
  process.exit(1);
}

console.log("[parity] clean");
