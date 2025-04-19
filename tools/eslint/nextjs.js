/** @type {import('eslint').Linter.Config} */
const config = {
  extends: ["plugin:@next/next/recommended", "./react.js"],
  rules: {
    "@next/next/no-html-link-for-pages": "off",
    "react/react-in-jsx-scope": "off"
  }
};

module.exports = config;
