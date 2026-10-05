module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testPathIgnorePatterns: ["<rootDir>/dist/"],
  // Integration tests share one disposable database and clean tables between
  // cases. Keep files serial so one suite cannot delete another suite's data.
  maxWorkers: 1,
};
