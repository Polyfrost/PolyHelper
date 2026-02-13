// @ts-check

import { defineConfig } from "eslint/config";
import globals from "globals";
import js from "@eslint/js";
import ts from "typescript-eslint";
import prettier from "eslint-config-prettier/flat";

export default defineConfig(
  { languageOptions: { globals: globals.node } },
  js.configs.recommended,
  ...ts.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        project: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  prettier,
  { ignores: ["old/", "dist/", "node_modules/", "eslint.config.js"] },
);
