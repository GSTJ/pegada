module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testPathIgnorePatterns: ["<rootDir>/dist/"],
  // Every suite that touches the database truncates the tables it uses in
  // beforeEach, against the one database from docker-compose.test.yml. In
  // parallel workers those wipes land in the middle of another suite's test
  // and it fails on rows that vanished. Drop this only alongside per-worker
  // database isolation.
  maxWorkers: 1,
};
