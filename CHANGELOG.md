# Changelog

All notable changes to this project will be documented in this file.

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
