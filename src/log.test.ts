/**
 * Tests for logging utilities.
 */

import type { ConsolaInstance } from "consola";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createLogger, formatDate, formatDuration, formatSize } from "./log.js";

describe("log", () => {
	describe("createLogger", () => {
		it("creates a logger with default options", () => {
			const logger = createLogger();
			expect(logger).toBeDefined();
			expect(typeof logger.info).toBe("function");
			expect(typeof logger.success).toBe("function");
			expect(typeof logger.warn).toBe("function");
			expect(typeof logger.error).toBe("function");
			expect(typeof logger.start).toBe("function");
		});

		it("creates a logger with custom name", () => {
			const logger = createLogger({ name: "test-cli" });
			expect(logger).toBeDefined();
		});

		it("creates a logger with custom level", () => {
			const logger = createLogger({ level: 0 }); // silent
			expect(logger).toBeDefined();
		});
	});

	describe("formatDuration", () => {
		it("formats milliseconds", () => {
			expect(formatDuration(0)).toBe("0ms");
			expect(formatDuration(1)).toBe("1ms");
			expect(formatDuration(500)).toBe("500ms");
			expect(formatDuration(999)).toBe("999ms");
		});

		it("formats seconds", () => {
			expect(formatDuration(1000)).toBe("1.0s");
			expect(formatDuration(1500)).toBe("1.5s");
			expect(formatDuration(59999)).toBe("60.0s");
		});

		it("formats minutes and seconds", () => {
			expect(formatDuration(60000)).toBe("1m 0s");
			expect(formatDuration(90000)).toBe("1m 30s");
			expect(formatDuration(125000)).toBe("2m 5s");
			expect(formatDuration(3600000)).toBe("60m 0s");
		});
	});

	describe("formatSize", () => {
		it("formats bytes", () => {
			expect(formatSize(0)).toBe("0 B");
			expect(formatSize(1)).toBe("1 B");
			expect(formatSize(1023)).toBe("1023 B");
		});

		it("formats kilobytes", () => {
			expect(formatSize(1024)).toBe("1.0 KB");
			expect(formatSize(1536)).toBe("1.5 KB");
			expect(formatSize(1048575)).toBe("1024.0 KB");
		});

		it("formats megabytes", () => {
			expect(formatSize(1048576)).toBe("1.00 MB");
			expect(formatSize(1572864)).toBe("1.50 MB");
			expect(formatSize(10485760)).toBe("10.00 MB");
		});

		it("formats gigabytes", () => {
			expect(formatSize(1073741824)).toBe("1.00 GB");
			expect(formatSize(1610612736)).toBe("1.50 GB");
		});
	});

	describe("formatDate", () => {
		it("formats ISO date string", () => {
			const result = formatDate("2026-04-06T12:30:45.000Z");
			// Result depends on timezone, just check format
			expect(result).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
		});

		it("formats Date object", () => {
			const date = new Date(2026, 3, 6, 12, 30);
			const result = formatDate(date);
			expect(result).toBe("2026-04-06 12:30");
		});

		it("handles midnight correctly", () => {
			const date = new Date(2026, 0, 1, 0, 0);
			const result = formatDate(date);
			expect(result).toBe("2026-01-01 00:00");
		});
	});
});
