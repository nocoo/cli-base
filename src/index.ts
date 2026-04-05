/**
 * @nocoo/cli-base — Shared CLI infrastructure
 *
 * Provides common utilities for CLI applications:
 * - Configuration management
 * - Browser-based OAuth login flow
 * - Update command helpers
 * - Version utilities
 * - Logging (consola wrapper)
 * - Cross-platform browser opening
 */

// Core utilities
export { ConfigManager, type ConfigManagerOptions } from "./config.js";
export {
	performLogin,
	escapeHtml,
	defaultGenerateNonce,
	type LoginDeps,
	type LoginResult,
} from "./login.js";
export {
	detectPackageManager,
	getLatestVersion,
	getUpdateCommand,
	type PackageManager,
} from "./update.js";
export { readVersion, compareVersions, isNewerVersion } from "./version.js";
export { getBrowserCommand, openBrowser } from "./browser.js";

// Logging
export {
	createLogger,
	formatDuration,
	formatSize,
	formatDate,
	consola,
	type LoggerOptions,
	type ConsolaInstance,
	type LogLevel,
} from "./log.js";

// Re-export citty for convenience
export { defineCommand, runMain, showUsage } from "citty";
export type { CommandDef, ArgsDef, SubCommandsDef } from "citty";

// Re-export picocolors for convenience
export { default as pc } from "picocolors";

// Re-export yocto-spinner for convenience
export { default as yoctoSpinner } from "yocto-spinner";
