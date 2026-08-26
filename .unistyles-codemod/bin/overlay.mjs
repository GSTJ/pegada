#!/usr/bin/env node
// Applies the hand-converted files the AST transform refused to touch.
//
// These are full file contents under `manual/`, mirroring their path in the
// repo, copied over the tree *after* the transform has run. That keeps
// `apply.sh` the single reproducible entry point: revert, transform, overlay,
// and the whole migration comes back byte for byte.
//
// The risk with an overlay is silent staleness — the transform changes, and a
// hand-written file keeps pinning the old output without anyone noticing. So
// every override records the SHA-256 of what the file looked like when it was
// written (its "pre-image"), and a mismatch is a hard error rather than a
// surprise in the diff. `--record` refreshes those hashes on purpose.

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const codemodRoot = path.resolve(here, "..");
const repoRoot = path.resolve(codemodRoot, "..");
const manualRoot = path.join(codemodRoot, "manual");
const manifestPath = path.join(manualRoot, "manifest.json");

const record = process.argv.includes("--record");

if (!fs.existsSync(manualRoot)) {
  console.log("[overlay] nothing to apply");
  process.exit(0);
}

const sha = (text) => crypto.createHash("sha256").update(text).digest("hex").slice(0, 16);

/** Every file under `manual/`, as repo-relative paths. */
function overrides(dir = manualRoot) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return overrides(full);
    if (!/\.(ts|tsx)$/.test(entry.name)) return [];
    return [path.relative(manualRoot, full)];
  });
}

const manifest = fs.existsSync(manifestPath)
  ? JSON.parse(fs.readFileSync(manifestPath, "utf8"))
  : {};

const files = overrides().sort();
const stale = [];
let applied = 0;

for (const file of files) {
  const target = path.join(repoRoot, file);
  const source = path.join(manualRoot, file);

  // The file may not exist yet if the override introduces one.
  const preImage = fs.existsSync(target) ? sha(fs.readFileSync(target, "utf8")) : "absent";

  if (record) {
    manifest[file] = preImage;
  } else if (manifest[file] !== undefined && manifest[file] !== preImage) {
    stale.push({ file, expected: manifest[file], actual: preImage });
    continue;
  }

  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
  applied += 1;
}

if (record) {
  fs.mkdirSync(manualRoot, { recursive: true });
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`[overlay] recorded ${files.length} pre-image(s)`);
  process.exit(0);
}

if (stale.length > 0) {
  console.error("[overlay] the transform now produces different input for these overrides:");
  for (const entry of stale) {
    console.error(`           ${entry.file} (recorded ${entry.expected}, got ${entry.actual})`);
  }
  console.error("           Re-check the hand conversion, then `overlay.mjs --record`.");
  process.exit(1);
}

console.log(`[overlay] applied ${applied} hand-converted file(s)`);
