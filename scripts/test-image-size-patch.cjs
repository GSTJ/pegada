const { spawnSync } = require("node:child_process");
const path = require("node:path");

const packageRoot = path.dirname(require.resolve("image-size/package.json"));

const cases = [
  {
    name: "ICNS zero-length entry",
    module: "icns",
    handler: "ICNS",
    input: [
      0x69, 0x63, 0x6e, 0x73, 0x00, 0x00, 0x00, 0x10, 0x69, 0x63, 0x30, 0x37,
      0x00, 0x00, 0x00, 0x00,
    ],
    method: "calculate",
  },
  {
    name: "JXL zero-length box",
    module: "jxl",
    handler: "JXL",
    input: [
      0x00, 0x00, 0x00, 0x0c, 0x4a, 0x58, 0x4c, 0x20, 0x0d, 0x0a, 0x87, 0x0a,
      0x00, 0x00, 0x00, 0x00, 0x6a, 0x75, 0x6e, 0x6b,
    ],
    method: "validate",
  },
  {
    name: "HEIF zero-length box",
    module: "heif",
    handler: "HEIF",
    input: [
      0x00, 0x00, 0x00, 0x00, 0x66, 0x74, 0x79, 0x70, 0x61, 0x76, 0x69, 0x66,
    ],
    method: "calculate",
  },
];

for (const testCase of cases) {
  const script = `
    const handler = require(${JSON.stringify(
      path.join(packageRoot, "dist", "types", "PLACEHOLDER.js"),
    )}.replace("PLACEHOLDER", ${JSON.stringify(testCase.module)}))[${JSON.stringify(
      testCase.handler,
    )}];
    try {
      handler[${JSON.stringify(testCase.method)}](Uint8Array.from(${JSON.stringify(
        testCase.input,
      )}));
    } catch {}
  `;

  const result = spawnSync(process.execPath, ["-e", script], {
    timeout: 1_000,
    encoding: "utf8",
  });

  if (result.error?.code === "ETIMEDOUT") {
    throw new Error(`${testCase.name} trapped the parser in an infinite loop`);
  }
  if (result.status !== 0) {
    throw new Error(
      `${testCase.name} failed unexpectedly: ${result.stderr || result.error}`,
    );
  }

  console.log(`PASS ${testCase.name}`);
}
