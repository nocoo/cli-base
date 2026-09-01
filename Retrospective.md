# Retrospective

Accident narratives for this repo.

Routing: narrative stays here. A project-specific rule that will recur may become one line in `CLAUDE.md`. Cross-project lessons go to nmem or a global rule. If it can be checked by a machine, add a hook or test instead of prose.

## Coverage excludes `scripts/`

- **What:** Counting `scripts/` in coverage failed the 95% gate.
- **Why:** `scripts/release.ts` is not unit-tested.
- **Follow-up:** `vitest.config.ts` `coverage.exclude` `scripts/**`.

## Coverage excludes the `src/index.ts` barrel

- **What:** The re-export barrel added no coverage signal.
- **Why:** Every symbol is covered by the modules it re-exports.
- **Follow-up:** `vitest.config.ts` `coverage.exclude` `src/index.ts`.

## `src/update-command.ts` is a coverage gap

- **What:** `update-command.ts` is excluded from coverage. There is no unit test and no L2/integration suite for `createUpdateCommand`.
- **Why:** `vitest.config.ts` comments claim an integration suite that does not exist; CI `enable-l2` is false.
- **Follow-up:** keep the exclude until tests exist; do not treat this file as covered.

## Publish compiled `dist/`, not `src/`

- **What:** An older handbook said `files: ["src"]` (consumers transpile). `package.json` now ships `files: ["dist"]` with `main`/`types` under `dist/`.
- **Why:** The package switched to `tsc` emit without updating CLAUDE.
- **Follow-up:** handbook + README. `dist/` is gitignored, so a release must `bun run build` before `npm publish`.
