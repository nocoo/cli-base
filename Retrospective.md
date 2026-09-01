# Retrospective

Accident narratives for this repo.

Routing: narrative stays here. A project-specific rule that will recur may become one line in `CLAUDE.md`. Cross-project lessons go to nmem or a global rule. If it can be checked by a machine, add a hook or test instead of prose.

## Coverage excludes non-library scripts

- **What:** Counting `scripts/` (and later `src/index.ts`, `src/update-command.ts`) in coverage failed the 95% gate.
- **Why:** Release tooling and the re-export barrel are not unit-tested; `update-command.ts` is a thin wrapper around `update.ts`.
- **Follow-up:** `vitest.config.ts` `coverage.exclude` those paths.

## Publish compiled `dist/`, not `src/`

- **What:** An older handbook said `files: ["src"]` (consumers transpile). `package.json` now ships `files: ["dist"]` with `main`/`types` under `dist/`.
- **Why:** The package switched to `tsc` emit without updating CLAUDE.
- **Follow-up:** handbook + README. `dist/` is gitignored, so a release must `bun run build` before `npm publish`.
