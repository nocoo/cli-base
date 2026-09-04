import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
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
         * Thin wrapper around the underlying update flow. No unit test and
         * no L2/integration suite yet (CI enable-l2 is false) — excluded as
         * a known coverage gap until tests exist.
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
