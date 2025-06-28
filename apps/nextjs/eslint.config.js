import nextjsConfig from "@pegada/eslint-config/nextjs";

/** @type {import('typescript-eslint').Config} */
export default [
  ...nextjsConfig,
  {
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      "@shopify/jsx-no-hardcoded-content": "off"
    }
  },
  {
    ignores: [
      "node_modules/**",
      "next.config.mjs",
      "*.config.js",
      "*.config.mjs"
    ]
  }
];
