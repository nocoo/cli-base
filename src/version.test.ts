/**
 * Tests for version utilities.
 */

import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { compareVersions, isNewerVersion, readVersion } from "./version.js";

describe("version", () => {
	let testDir: string;

	beforeEach(() => {
		testDir = join(tmpdir(), `cli-base-version-test-${Date.now()}`);
		mkdirSync(testDir, { recursive: true });
	});

	afterEach(() => {
		rmSync(testDir, { recursive: true, force: true });
	});

	describe("readVersion", () => {
		it("reads version from package.json", () => {
			writeFileSync(
				join(testDir, "package.json"),
				JSON.stringify({ version: "1.2.3" }),
			);

			const version = readVersion(testDir);
			expect(version).toBe("1.2.3");
		});

		it("returns '0.0.0' when package.json does not exist", () => {
			const version = readVersion(join(testDir, "nonexistent"));
			expect(version).toBe("0.0.0");
		});

		it("returns '0.0.0' when package.json is invalid JSON", () => {
			writeFileSync(join(testDir, "package.json"), "invalid json");
			const version = readVersion(testDir);
			expect(version).toBe("0.0.0");
		});

		it("returns '0.0.0' when version field is missing", () => {
			writeFileSync(
				join(testDir, "package.json"),
				JSON.stringify({ name: "test" }),
			);
			const version = readVersion(testDir);
			expect(version).toBe("0.0.0");
		});

		it("reads version from custom filename", () => {
			writeFileSync(
				join(testDir, "custom.json"),
				JSON.stringify({ version: "2.0.0" }),
			);

			const version = readVersion(testDir, "custom.json");
			expect(version).toBe("2.0.0");
		});
	});

	describe("compareVersions", () => {
		it("returns 0 for equal versions", () => {
			expect(compareVersions("1.0.0", "1.0.0")).toBe(0);
			expect(compareVersions("0.1.0", "0.1.0")).toBe(0);
			expect(compareVersions("10.20.30", "10.20.30")).toBe(0);
		});

		it("returns positive when a > b (major)", () => {
			expect(compareVersions("2.0.0", "1.0.0")).toBeGreaterThan(0);
			expect(compareVersions("10.0.0", "9.0.0")).toBeGreaterThan(0);
		});

		it("returns negative when a < b (major)", () => {
			expect(compareVersions("1.0.0", "2.0.0")).toBeLessThan(0);
			expect(compareVersions("9.0.0", "10.0.0")).toBeLessThan(0);
		});

		it("returns positive when a > b (minor)", () => {
			expect(compareVersions("1.2.0", "1.1.0")).toBeGreaterThan(0);
			expect(compareVersions("1.10.0", "1.9.0")).toBeGreaterThan(0);
		});

		it("returns negative when a < b (minor)", () => {
			expect(compareVersions("1.1.0", "1.2.0")).toBeLessThan(0);
		});

		it("returns positive when a > b (patch)", () => {
			expect(compareVersions("1.0.2", "1.0.1")).toBeGreaterThan(0);
		});

		it("returns negative when a < b (patch)", () => {
			expect(compareVersions("1.0.1", "1.0.2")).toBeLessThan(0);
		});

		it("handles versions with different segment lengths", () => {
			expect(compareVersions("1.0", "1.0.0")).toBe(0);
			expect(compareVersions("1", "1.0.0")).toBe(0);
			expect(compareVersions("1.0.1", "1.0")).toBeGreaterThan(0);
		});
	});

	describe("isNewerVersion", () => {
		it("returns true when latest is newer", () => {
			expect(isNewerVersion("1.0.0", "1.0.1")).toBe(true);
			expect(isNewerVersion("1.0.0", "1.1.0")).toBe(true);
			expect(isNewerVersion("1.0.0", "2.0.0")).toBe(true);
		});

		it("returns false when latest is same", () => {
			expect(isNewerVersion("1.0.0", "1.0.0")).toBe(false);
		});

		it("returns false when latest is older", () => {
			expect(isNewerVersion("2.0.0", "1.0.0")).toBe(false);
		});
	});
});
