const js = require("@eslint/js");
const globals = require("globals");

module.exports = [
  {
    ignores: ["dist/**", "node_modules/**"],
  },
  {
    files: ["**/*.js"],
    ...js.configs.recommended,
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "commonjs",
      globals: {
        ...globals.node,
      },
    },
    rules: {
      ...js.configs.recommended.rules,
      "no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
    },
  },
];
