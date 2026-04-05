# CLAUDE.md

## Project Overview

**@nocoo/cli-base** is a shared CLI infrastructure library for hexly.ai TypeScript projects. It provides reusable components for building CLI tools: config management, OAuth login flows, update checking, version utilities, browser opening, and logging.

## Tech Stack

- **Runtime**: Bun
- **Language**: TypeScript (strict)
- **Dependencies**: citty, consola, picocolors, yocto-spinner
- **Testing**: Vitest (95%+ coverage threshold)
- **Linting**: TypeScript + Biome
- **Git Hooks**: Husky (6DQ: L1 + G1 pre-commit, G2 pre-push)

## Key Commands

```bash
bun install              # Install dependencies
bun run test             # Run unit tests
bun run test:coverage    # Run tests with coverage report
bun run lint             # Type-check + Biome lint
bun run lint:fix         # Auto-fix lint issues

# Release (automated)
bun run release          # Patch release (0.1.1 → 0.1.2)
bun run release minor    # Minor release (0.1.1 → 0.2.0)
bun run release major    # Major release (0.1.1 → 1.0.0)
bun run release 1.2.3    # Explicit version
bun run release --dry-run # Preview without executing
```

## Release Script

`scripts/release.ts` automates the full release workflow:

1. Validates clean working directory
2. Runs `bun run test:coverage`
3. Runs `bun run lint`
4. Bumps version in package.json
5. Generates CHANGELOG.md entry from git commits
6. Creates git commit + tag
7. Pushes to GitHub (with tag)
8. Publishes to npm
9. Creates GitHub release

## Module Structure

| Module | Purpose |
|--------|---------|
| `config.ts` | Generic ConfigManager<T> with dev/prod separation, sync/async API, 0600 permissions |
| `login.ts` | Browser OAuth with local loopback callback server, XSS protection |
| `update.ts` | Package manager detection (bun/pnpm/yarn/npm), npm registry queries |
| `version.ts` | Read version from package.json, semver comparison |
| `browser.ts` | Cross-platform URL opening (macOS/Windows/Linux) |
| `log.ts` | Consola wrapper with formatDuration/formatSize/formatDate helpers |
| `index.ts` | Re-exports all modules + citty, consola, picocolors, yocto-spinner |

## Six-Dimension Quality Framework

| Dimension | What | When | Threshold |
|-----------|------|------|-----------|
| L1: UT | Business logic unit tests | pre-commit | 95% coverage |
| G1: Static | tsc --noEmit + Biome lint | pre-commit | Zero errors |
| G2: Security | gitleaks secret scanning | pre-push | Zero findings |

## Retrospective

- **npm package files field**: Publishing TypeScript source directly (`files: ["src"]`) instead of compiled dist. Consumers use their own bundler/transpiler.
- **vitest coverage exclude**: `scripts/` directory must be excluded from coverage calculation — release script is not unit-testable and would tank coverage metrics.
