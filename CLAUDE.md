# base-cli

Shared CLI infrastructure (`@nocoo/base-cli`): config, OAuth loopback login, update check, version, browser open, logging.
Profile: cli-library
Direction: [README.md](README.md). No `docs/` tree. Frameworks must not rewrite this file.

## Sources of Truth

This file is the **contract**. Hooks, CI, and config are **enforcement**. If they disagree, that is a failure — raise enforcement; never lower this file to a weaker hook.

| Fact | Where |
|---|---|
| Agent handbook | this file |
| Human docs | README.md |
| Version | `package.json` `"version"` |
| Enforcement | `.husky/*`, `.github/workflows/ci.yml`, `vitest.config.ts` |
| Machine rules | global `AGENTS.md`, `rules/git-commit.md` |
| Accidents | [Retrospective.md](Retrospective.md) |
| Env files | omit |

## Project Invariants

- Ship `files: ["dist"]` (`main`/`types` under `dist/`). Do not publish `src/`.
- `dist/` is gitignored. `bun run build` (`tsc`) must exist before `npm publish`; `scripts/release.ts` currently does **not** run build.
- Vitest coverage excludes `scripts/` and `src/index.ts`. `src/update-command.ts` is also excluded — that is a coverage gap, not a tested wrapper.
- Config files this library writes use mode `0600`.
- Hooks are check-only. Do not run `lint:fix` from a hook.

## Stack / Layout

| Component | Choice |
|---|---|
| Language | TypeScript 7 strict |
| Package manager | Bun |
| Runtime | library for Bun/Node CLIs (citty, consola, picocolors, yocto-spinner) |
| Lint | `tsc --noEmit` + Biome `check --error-on-warnings src/` |
| Tests | Vitest L1 (95% statements/branches/functions/lines) |
| Data | none (consumers own config dirs) |

```
src/          library + `*.test.ts`
scripts/      release.ts
```

## Commands

```bash
bun run typecheck
bun run lint
bun run build
bun run test
bun run test:coverage
bun run build && bun run release
bun run release --dry-run
```

## Verification

Status: `enforced` | `planned` | `manual` | `N/A`. `enforced` Evidence = hook/CI/config/script. `planned` has no Evidence. `manual` = human checklist.

Org gaps to raise later (do not lower this file): index-snapshot pre-commit; stdin-range pre-push; coverage on pre-commit; `.skip`/`.only`; gitleaks missing binary must fail (pre-push currently skips); release must `build` and must not `--no-verify`.

Today: pre-commit typecheck/lint/`test` (no coverage)/`gitleaks protect --staged` on the working tree. pre-push gitleaks detect (skip if missing) + osv-scanner. CI `bun-quality.yml@aec4adc1a817c56790d1698329ef9398a15a754a` (comment: v2026.5): build, lint, `test:coverage`, gitleaks, osv; typecheck command is `true` (skipped; emit is the pre-command `tsc`). `lint-staged` in package.json is unused.

| Change | Proof | Status | Evidence |
|---|---|---|---|
| Logic | L1 vitest ≥95% all four metrics | enforced | CI → `test:coverage`; `vitest.config.ts`. pre-commit → `test` without thresholds |
| API L2 | — | N/A | — |
| UI L3 | — | N/A | — |
| Types / lint | tsc + Biome 0 warning | enforced | pre-commit → `typecheck`, `lint` (working tree); CI → `lint` (`tsc` emit via pre-command). tsc excludes `**/*.test.ts` |
| G2 secrets | gitleaks | enforced | pre-commit → `gitleaks protect --staged`; CI bun-quality. pre-push `gitleaks detect` skips if binary missing |
| G2 deps | osv-scanner | enforced | pre-push → `osv-scanner scan --lockfile=bun.lock --config=osv-scanner.toml`; CI bun-quality (no `osv-config` input) |
| `.skip` / `.only` | lint error | planned | — |
| Bundler | `tsc` → `dist/` | enforced | CI pre-command `bun run build`; not in husky; release does not build |
| Docs | README if public API changes | manual | human review |
| Release | bump + changelog + npm + gh release | enforced | `bun run build && bun run release` (`scripts/release.ts` still does not build) |

| Hook | Org bar | Status | Evidence |
|---|---|---|---|
| pre-commit | index snapshot for G1+L1 | planned | — |
| pre-push | stdin ref range | planned | — |

`--no-verify` forbidden on commits and branch pushes. Tag-only may skip. `scripts/release.ts` currently commits and pushes with `--no-verify` — do not copy that for normal work.

## Operations / Release

- Entry: `bun run build && bun run release` (patch default; `minor` / `major` / `x.y.z`; `--dry-run`). Who: npm publish rights on `@nocoo/base-cli` and GitHub write on `nocoo/base-cli` (`gh release`).
- Script runs `test:coverage` + `lint`, writes `package.json` + `CHANGELOG.md`, commit/tag/push `--no-verify`, `npm publish --access public`, `gh release create`. It does not run `bun run build`.
- Live-check: `npm view @nocoo/base-cli version` and the GitHub release URL the script prints.
- Pin CI as `nocoo/base-ci/.github/workflows/bun-quality.yml@aec4adc1a817c56790d1698329ef9398a15a754a` (ci.yml comment: v2026.5). Do not switch the pin to moving `@v2026`.

## Retrospective

| Kind | Where |
|---|---|
| Accident narrative | [Retrospective.md](Retrospective.md) |
| Recurring project rule | one line here (cap ~10) |
| Cross-project | nmem / global rules |
| Checkable rule | hook or test |

- Coverage excludes `scripts/` and `src/index.ts`. `src/update-command.ts` is an untested coverage gap.
- Publish `dist/`, not `src/`.
