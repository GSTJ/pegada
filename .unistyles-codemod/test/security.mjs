import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { Project } from 'ts-morph';

// Resolve exactly the package consumed by ts-morph, including nested installs.
const require = createRequire(import.meta.url);
const consumer = createRequire(require.resolve('@ts-morph/common'));
const { minimatch, Minimatch } = consumer('minimatch');
assert.equal(consumer('minimatch/package.json').version, '11.0.4');
const project = new Project({ useInMemoryFileSystem: true });
for (const file of ['/src/a.ts', '/src/b.tsx', '/src/deep/c.ts', '/src/a.test.ts',
  '/src/.hidden.ts', '/other/a.ts']) project.createSourceFile(file, 'export {};');
const matches = patterns => project.getSourceFiles(patterns).map(f => f.getFilePath()).sort();
assert.deepEqual(matches('/src/**/*.{ts,tsx}'),
  ['/src/a.test.ts', '/src/a.ts', '/src/b.tsx', '/src/deep/c.ts']);
assert.deepEqual(matches(['/src/**/*.{ts,tsx}', '!**/*.test.ts', '!**/deep/**']),
  ['/src/a.ts', '/src/b.tsx']);
assert.deepEqual(matches('/missing/**/*.ts'), []);
assert.equal(minimatch('src/a.ts', 'src/+(a|b).ts'), true);
assert.equal(minimatch('src/c.ts', 'src/+(a|b).ts'), false);
assert.equal(minimatch('src/.hidden.ts', 'src/*.ts'), false);
console.log('PASS ts-morph consumer globs: braces, globstar, exclusions, missing paths, extglobs, dotfiles');
if (process.argv.includes('--amplification-worker')) {
  const pattern = Array(30).fill('**/../a/b').join('/');
  assert.equal(new Minimatch(pattern, { optimizationLevel: 2, braceExpandMax: 64 }).set.length, 64);
  assert.equal(new Minimatch(pattern, { optimizationLevel: 2 }).set.length, 100_000);
  const large = new Minimatch('{x,*}/{0..999}', { optimizationLevel: 2 });
  assert.equal(large.set.length, 2000);
  assert.equal(large.match('y/999'), true);
  assert.equal(large.match('.y/5'), false);
  console.log('PASS malicious optimizationLevel=2 pattern: 64 explicit / 100000 default cap; large-set matching');
} else {
  // A vulnerable implementation must fail within a bounded child, never hang CI.
  const result = spawnSync(process.execPath, ['--max-old-space-size=512', fileURLToPath(import.meta.url),
    '--amplification-worker'], { encoding: 'utf8', timeout: 15_000 });
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stderr);
  process.stdout.write(result.stdout);
}
