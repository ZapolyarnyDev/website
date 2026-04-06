import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import eslintConfigPrettier from "eslint-config-prettier";
import astro from "eslint-plugin-astro";
import * as mdx from "eslint-plugin-mdx";
import globals from "globals";
import tseslint from "typescript-eslint";

const scriptFiles = ["**/*.{js,mjs,cjs,ts,mts,cts}"];
const moduleScriptFiles = ["**/*.{js,mjs,ts,mts}"];
const commonjsScriptFiles = ["**/*.{cjs,cts}"];

const baseRules = {
  "no-alert": "error",
  "no-console": ["error", { allow: ["warn", "error"] }],
  "no-debugger": "error",
};

const typedRules = {
  ...baseRules,
  "no-unused-vars": "off",
  "@typescript-eslint/no-unused-vars": [
    "error",
    {
      argsIgnorePattern: "^_",
      varsIgnorePattern: "^_",
    },
  ],
};

export default defineConfig([
  {
    ignores: [".astro/**", "dist/**", "node_modules/**"],
  },
  {
    files: moduleScriptFiles,
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },
  {
    files: commonjsScriptFiles,
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "commonjs",
      globals: {
        ...globals.node,
      },
    },
  },
  {
    files: scriptFiles,
    plugins: {
      "@typescript-eslint": tseslint.plugin,
    },
    languageOptions: {
      parser: tseslint.parser,
    },
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
      ...tseslint.configs.strict,
    ],
    rules: typedRules,
  },
  ...astro.configs.recommended,
  {
    files: ["**/*.astro"],
    rules: baseRules,
  },
  {
    ...mdx.flat,
    files: ["**/*.mdx"],
    rules: {
      ...mdx.flat.rules,
      "no-console": ["error", { allow: ["warn", "error"] }],
    },
  },
  eslintConfigPrettier,
]);
