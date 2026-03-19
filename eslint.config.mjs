import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";

export default tseslint.config(
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/target/**",
      "**/test-results/**",
      "**/.vite/**",
      "**/.vite-temp/**",
      "apps/desktop/src/package-shims.d.ts",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["apps/desktop/src/**/*.{ts,tsx}", "apps/desktop/e2e/**/*.ts", "packages/**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.browser,
      },
    },
    plugins: {
      "react-hooks": reactHooks,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
  {
    files: ["apps/desktop/e2e/**/*.ts"],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
);
