# Changelog

All notable changes to this project will be documented in this file.

## [0.3.0] - 2026-07-17

### Breaking Changes

- **Package renamed** from `@nocoo/cli-base` to `@nocoo/base-cli`.
  The old package on npm is deprecated and points at this new name.
  API surface is unchanged — consumers only need to update their `package.json` dependency and `import` paths:

  ```diff
  - "@nocoo/cli-base": "^0.2.4"
  + "@nocoo/base-cli": "^0.3.0"
  ```

  ```diff
  - import { ConfigManager } from "@nocoo/cli-base";
  + import { ConfigManager } from "@nocoo/base-cli";
  ```

### Chores

- upgrade TypeScript `6.0.3` → `^7.0.2`
- tighten Biome to `preset: "all"` + `nursery.recommended`, with a small set of explicit opt-outs documented in `biome.json`
- bump `@biomejs/biome` `2.4.16` → `^2.5.4`
- bump `vitest` and `@vitest/coverage-v8` `4.1.8` → `^4.1.10`
- bump `@types/node` `^25.9.2` → `^26.1.1`
- remove unused runtime dependency `postcss` (overrides still enforce the CVE floor)

## [0.2.4] - 2026-04-18

### Features

- add params field to LoginResult

### Fixes

- 迁移到 base-ci@v2026，禁用 L2 E2E
- update vite to fix CVEs

## [0.2.1] - 2026-04-07

### Features

- mandatory CSRF, macOS localhost compatibility, accent color, ensureDeviceId
- add createUpdateCommand for standard CLI update command
- add CSRF state nonce protection
- add configurable tokenParam and loginPath options
- add automated release script
- initial CLI base library

### Fixes

- Windows start command treats quoted URL as window title
- publish compiled JS instead of TypeScript source
- avoid exactOptionalPropertyTypes conflict
- include all source files in npm package

## [0.1.7] - 2026-04-06

### Features

- add createUpdateCommand for standard CLI update command
- add CSRF state nonce protection
- add configurable tokenParam and loginPath options
- add automated release script
- initial CLI base library

### Fixes

- publish compiled JS instead of TypeScript source
- avoid exactOptionalPropertyTypes conflict
- include all source files in npm package

## [0.1.2] - 2026-04-06

### Features

- add automated release script

## [0.1.1] - 2026-04-06

### Fixes

- **npm package** — Include all source files in published package (was missing due to incorrect `files` field)

## [0.1.0] - 2026-04-06

### Features

- **ConfigManager** — Generic config file management with dev/prod separation, sync/async API, 0600 permissions
- **Login Flow** — Browser-based OAuth with local loopback callback server, XSS protection
- **Update Helpers** — Package manager detection (bun/pnpm/yarn/npm), npm registry queries
- **Version Utils** — Read version from package.json, semver comparison
- **Browser** — Cross-platform URL opening (macOS/Windows/Linux)
- **Log** — Consola wrapper with formatDuration/formatSize/formatDate helpers

### Infrastructure

- 95%+ test coverage with Vitest
- 6DQ pre-commit hooks (L1+G1)
- Re-exports citty, consola, picocolors, yocto-spinner for convenience
