import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      // experimentalAstAwareRemapping intentionally omitted — enabling it on vitest 3.x
      // causes coverage variance that drops lines/statements below the 95% thresholds.
      // Re-evaluate when upgrading to vitest v4 (where AST remapping is the default).
      reporter: ["text", "json", "html"],
      exclude: [
        // Test files themselves.
        "**/*.test.ts",
        // Build output.
        "dist/**",
        // Build/release tooling, not shipped code.
        "scripts/**",
        // The coverage config itself.
        "vitest.config.ts",
        /*
         * Pure re-export barrel — exercising it adds no signal because every
         * symbol is covered by the tests of the modules it re-exports.
         */
        "src/index.ts",
        /*
         * Thin wrapper around the underlying update flow. Behaviour is
         * exercised end-to-end via the integration suite rather than unit
         * tests, so excluding it here avoids misleading coverage gaps.
         */
        "src/update-command.ts",
      ],
      thresholds: {
        statements: 95,
        branches: 95,
        functions: 95,
        lines: 95,
      },
    },
  },
});
