// Replay the one-shot migration against its committed output. Later app UI
// edits intentionally diverge from the original styled-components ground truth.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync, spawnSync } from 'node:child_process';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const tool = path.join(root, '.unistyles-codemod');
const ref = '3cce8b30d6a14759fe78c3cca61b9bc2609b2b64';
const report = JSON.parse(fs.readFileSync(path.join(tool, 'report.json')));
const manual = fs.readdirSync(path.join(tool, 'manual')).filter(f => f.endsWith('.json'))
  .flatMap(f => JSON.parse(fs.readFileSync(path.join(tool, 'manual', f))).units);
const files = [...new Set([...report.units.filter(u => u.status === 'converted'), ...manual]
  .flatMap(u => [u.file, ...(u.pristineDeps ?? [])]))].sort();
// Refuse concurrent source edits; every overlaid byte is restored in finally.
if (execFileSync('git', ['diff', 'HEAD', '--', ...files], { cwd: root }).length)
  throw new Error('Commit or stash app source edits before replaying history');
const originals = new Map(['parity-report.json', 'parity-manual-report.json'].map(file => {
  const absolute = path.join(tool, file);
  return [absolute, fs.readFileSync(absolute)];
}));
let status = 1;
try {
  for (const file of files) {
    const absolute = path.join(root, file);
    originals.set(absolute, fs.existsSync(absolute) ? fs.readFileSync(absolute) : null);
    const source = execFileSync('git', ['show', `${ref}:${file}`], { cwd: root });
    fs.mkdirSync(path.dirname(absolute), { recursive: true });
    fs.writeFileSync(absolute, source);
  }
  console.log(`Historical migration output: ${execFileSync('git', ['rev-parse', ref], { cwd: root }).toString().trim()}`);
  console.log(`Overlay manifest: ${JSON.stringify(files)}`);
  status = spawnSync('npm', ['test'], { cwd: tool, stdio: 'inherit' }).status ?? 1;
} finally {
  for (const [absolute, contents] of originals) {
    if (contents === null) fs.rmSync(absolute);
    else fs.writeFileSync(absolute, contents);
  }
}
process.exitCode = status;
