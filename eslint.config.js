import eslint from "@eslint/js";
import jsxA11y from "eslint-plugin-jsx-a11y";
import globals from "globals";
import typescriptEslint from "typescript-eslint";

export default typescriptEslint.config(
  {
    ignores: ["**/dist/**", "**/generated/**", "**/node_modules/**"],
  },
  eslint.configs.recommended,
  ...typescriptEslint.configs.recommended,
  {
    files: ["apps/web/**/*.{ts,tsx}"],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: { "jsx-a11y": jsxA11y },
    rules: jsxA11y.flatConfigs.recommended.rules,
  },
  {
    files: [
      "apps/backend/**/*.ts",
      "packages/**/*.ts",
      "*.{js,ts}",
      "scripts/**/*.mjs",
    ],
    languageOptions: { globals: globals.node },
  },
);
