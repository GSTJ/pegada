const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { createRequire } = require("node:module");

const expoRequire = createRequire(require.resolve("@expo/config/package.json"));
const modernGlob = expoRequire("glob");
const modernMinimatch = createRequire(expoRequire.resolve("glob"))("minimatch");
const merge = require("deepmerge");
const forge = require("node-forge");

const keys = forge.pki.rsa.generateKeyPair(512);
const digest = forge.md.sha256.create();
digest.update("pegada-regression");
const signature = keys.privateKey.sign(digest);
assert.equal(keys.publicKey.verify(digest.digest().bytes(), signature), true);
console.log("PASS node-forge signature round trip");

// Null-prototype inputs bypassed the old source-key guard. Also protect the
// initial target copy and the independently shipped UMD entry point.
for (const deepmerge of [merge, require("deepmerge/dist/umd.js")]) {
  const poison = JSON.parse('{"__proto__":{"poisoned":true}}');
  for (const result of [
    deepmerge(Object.create(null), poison),
    deepmerge(poison, {}),
    deepmerge({}, { nested: poison }),
  ]) {
    assert.equal(result.poisoned, undefined);
    assert.equal(Object.getPrototypeOf(result), Object.prototype);
    assert.equal(result.nested?.poisoned, undefined);
  }
  assert.deepEqual(
    deepmerge({ a: [1], b: { x: 1 } }, { a: [2], b: { y: 2 } }),
    {
      a: [1, 2],
      b: { x: 1, y: 2 },
    },
  );
}

// Bound regressions in separate processes: a vulnerable parser must fail the
// check without freezing the test runner itself.
for (const [name, script] of [
  [
    "URI decoder",
    `const decode = require('decode-uri-component').default;
    let input = ''; for(let i=0;i<32000;i++) input += '%' + (i>>8).toString(16).padStart(2,'0') + '%' + (i%256).toString(16).padStart(2,'0') + 'x';
    decode(input + '%zz');`,
  ],
  [
    "Joi multiple emails",
    `const Joi = require('joi');
    if (!Joi.string().email({multiple:true}).validate(' '.repeat(200000)).error) process.exit(1);`,
  ],
  [
    "legacy minimatch",
    `const {Minimatch} = require('minimatch');
    new Minimatch('**/../'.repeat(100), {optimizationLevel:2});
    if (!require('minimatch')('dog.jpg','*.{jpg,png}')) process.exit(1);`,
  ],
  [
    "modern minimatch",
    `const {createRequire}=require('node:module');
    const r=createRequire(require.resolve('@expo/config/package.json'));
    new (createRequire(r.resolve('glob'))('minimatch').Minimatch)('**/../'.repeat(100),{optimizationLevel:2});`,
  ],
]) {
  const result = spawnSync(process.execPath, ["-e", script], { timeout: 2000 });
  assert.equal(result.status, 0, `${name}: ${result.error || result.stderr}`);
  console.log(`PASS ${name}`);
}
assert.equal(typeof modernMinimatch.minimatch, "function");

async function checkAbort() {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), "pegada-glob-abort-"));
  try {
    for (let index = 0; index < 20; index++) {
      fs.mkdirSync(path.join(fixture, String(index)));
      fs.writeFileSync(path.join(fixture, String(index), "dog.txt"), "dog");
    }
    const controller = new AbortController();
    let reads = 0;
    const instrumentedFs = {
      ...fs,
      readdir: (...args) => {
        reads++;
        controller.abort(new Error("probe-abort"));
        return fs.readdir(...args);
      },
    };
    await assert.rejects(
      modernGlob.glob("**/*", {
        cwd: fixture,
        signal: controller.signal,
        fs: instrumentedFs,
      }),
      /probe-abort/,
    );
    await new Promise((resolve) => {
      setTimeout(resolve, 50);
    });
    assert.equal(reads, 1, "no directory traversal after cancellation");
    console.log("PASS glob cancellation stops traversal");
  } finally {
    fs.rmSync(fixture, { recursive: true });
  }
}
checkAbort().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
