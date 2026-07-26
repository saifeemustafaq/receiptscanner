import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  // DEVELOPER_GUIDE §9: the JSON storage boundary and the AI response validator
  // are the one accepted `any` zone (raw file/model data before it is converted
  // to a real type). Allow `any` in exactly those files so `npm run lint` can be
  // a real gate; the rule stays ON everywhere else, so leaks upward still error.
  {
    files: ["lib/*Storage.ts", "lib/ai/parseResponse.ts"],
    rules: { "@typescript-eslint/no-explicit-any": "off" },
  },
  // Standalone Node smoke-test scripts are CommonJS (the repo has no
  // "type": "module"), so `require()` is correct at runtime, not a violation.
  {
    files: ["scripts/**/*.js"],
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
]);

export default eslintConfig;
