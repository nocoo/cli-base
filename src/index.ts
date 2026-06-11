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

export type { ArgsDef, CommandDef, SubCommandsDef } from "citty";
// Re-export citty for convenience
export { defineCommand, runMain, showUsage } from "citty";
// Re-export picocolors for convenience
export { default as pc } from "picocolors";
// Re-export yocto-spinner for convenience
export { default as yoctoSpinner } from "yocto-spinner";
export { getBrowserCommand, openBrowser } from "./browser.js";
// Core utilities
export { ConfigManager, type ConfigManagerOptions } from "./config.js";

// Logging
export {
	type ConsolaInstance,
	consola,
	createLogger,
	formatDate,
	formatDuration,
	formatSize,
	type LoggerOptions,
	type LogLevel,
} from "./log.js";
export {
	defaultGenerateNonce,
	escapeHtml,
	type LoginDeps,
	type LoginResult,
	performLogin,
} from "./login.js";
export {
	detectPackageManager,
	getLatestVersion,
	getUpdateCommand,
	type PackageManager,
} from "./update.js";
export {
	createUpdateCommand,
	type UpdateCommandOptions,
} from "./update-command.js";
export { compareVersions, isNewerVersion, readVersion } from "./version.js";
