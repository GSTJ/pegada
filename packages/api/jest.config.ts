module.exports = {
  preset: "ts-jest",
  // Owned by the runner rather than repeated as `jest.clearAllMocks()` in every
  // suite's beforeEach, where it is easy to forget one.
  clearMocks: true,
  testEnvironment: "node",
  testPathIgnorePatterns: ["<rootDir>/dist/"],
  // @faker-js/faker ships ESM-only from v9 on, and Jest's default
  // transformIgnorePatterns skips all of node_modules, so its `import`
  // syntax hit Jest as a raw parse error. Let Jest reach into the package
  // and run it through babel's CJS transform, same as our own TS files.
  transformIgnorePatterns: ["/node_modules/(?!@faker-js/faker/)"],
  transform: {
    "^.+\\.tsx?$": ["ts-jest", {}],
    "^.+\\.jsx?$": [
      "babel-jest",
      { plugins: ["@babel/plugin-transform-modules-commonjs"] },
    ],
  },
  // Every suite that touches the database truncates the tables it uses in
  // beforeEach, against the one database from docker-compose.test.yml. In
  // parallel workers those wipes land in the middle of another suite's test
  // and it fails on rows that vanished. Drop this only alongside per-worker
  // database isolation.
  maxWorkers: 1,
};
