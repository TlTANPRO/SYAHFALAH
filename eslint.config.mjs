import { defineConfig, globalIgnores } from "eslint/config";
import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import jsxA11yPlugin from "eslint-plugin-jsx-a11y";
import importPlugin from "eslint-plugin-import";

// Hand-rolled flat config — avoids loading eslint-config-next which
// transitively requires @rushstack/eslint-patch (broken on ESLint 9.39.5+).
// Trade-off: we lose Next.js-specific core-web-vitals rules, but keep the
// universal React + a11y + import rules. Add `@next/eslint-plugin-next`
// later when available as a direct dep.

export default defineConfig([
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "node_modules/**",
    "next-env.d.ts",
    "supabase/**",
  ]),
  {
    files: ["**/*.{js,jsx,mjs,cjs}"],
    plugins: {
      import: importPlugin,
      react: reactPlugin,
      "react-hooks": reactHooksPlugin,
      "jsx-a11y": jsxA11yPlugin,
    },
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        process: "readonly",
        console: "readonly",
        Buffer: "readonly",
        window: "readonly",
        document: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        module: "readonly",
        require: "readonly",
        exports: "writable",
        global: "readonly",
      },
    },
    settings: {
      react: { version: "detect" },
    },
    rules: {
      "react/react-in-jsx-scope": "off",         // Next.js auto-imports React
      "react/prop-types": "off",
      "react/jsx-uses-react": "off",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "import/no-unresolved": "off",              // TypeScript handles
      "import/order": "off",
      "jsx-a11y/anchor-is-valid": "warn",
      "no-undef": "off",                          // TS handles
      "no-unused-vars": "warn",
    },
  },
]);
