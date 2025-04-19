/** @type {import("eslint").Linter.Config} */
module.exports = {
  extends: ["./base.js", "plugin:deprecation/recommended"],
  plugins: ["@typescript-eslint"],
  parser: "@typescript-eslint/parser",
  settings: {
    react: {
      version: "detect"
    }
  },
  extends: ["plugin:@typescript-eslint/recommended"],
  rules: {
    "@typescript-eslint/no-unused-vars": [
      "error",
      {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_"
      }
    ],
    "@typescript-eslint/await-thenable": "error",
    "@typescript-eslint/no-floating-promises": "error",
    "@typescript-eslint/no-unnecessary-boolean-literal-compare": "error",
    "@typescript-eslint/return-await": "error",
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/no-require-imports": "off"
  }
};
