/**
 * Logging utilities for CLI applications.
 *
 * Built on consola with additional formatting helpers.
 */

import { type ConsolaInstance, type LogLevel, createConsola } from "consola";

export interface LoggerOptions {
	/** Logger name (shown in output) */
	name?: string;
	/** Log level (0=silent, 5=trace) */
	level?: LogLevel;
}

/**
 * Create a pre-configured consola logger instance.
 */
export function createLogger(options: LoggerOptions = {}): ConsolaInstance {
	const { name, level } = options;

	return createConsola({
		level: level ?? 3, // default: info
		formatOptions: {
			date: false,
			colors: true,
			compact: true,
		},
	}).withTag(name ?? "");
}

/**
 * Format duration in human-readable form.
 *
 * @param ms - Duration in milliseconds
 * @returns Formatted string (e.g., "1.5s", "2m 30s")
 */
export function formatDuration(ms: number): string {
	if (ms < 1000) return `${ms}ms`;
	if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
	const min = Math.floor(ms / 60_000);
	const sec = Math.floor((ms % 60_000) / 1000);
	return `${min}m ${sec}s`;
}

/**
 * Format file size in human-readable form.
 *
 * @param bytes - Size in bytes
 * @returns Formatted string (e.g., "1.5 KB", "10.00 MB")
 */
export function formatSize(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	const kb = bytes / 1024;
	if (kb < 1024) return `${kb.toFixed(1)} KB`;
	const mb = kb / 1024;
	if (mb < 1024) return `${mb.toFixed(2)} MB`;
	const gb = mb / 1024;
	return `${gb.toFixed(2)} GB`;
}

/**
 * Format date in YYYY-MM-DD HH:mm format.
 *
 * @param input - ISO date string or Date object
 * @returns Formatted date string
 */
export function formatDate(input: string | Date): string {
	const d = typeof input === "string" ? new Date(input) : input;
	const pad = (n: number) => String(n).padStart(2, "0");
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Re-export consola for direct use
export { consola } from "consola";
export type { ConsolaInstance, LogLevel } from "consola";
