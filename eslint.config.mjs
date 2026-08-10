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
    // Vendored source from the @bklit shadcn registry. It lives in the repo so
    // the charts can be themed and upgraded deliberately, but it is upstream
    // code — linting it produces noise we cannot act on without diverging from
    // the registry. Our own chart usage lives in app/**/_components.
    "components/charts/**",
  ]),
]);

export default eslintConfig;
