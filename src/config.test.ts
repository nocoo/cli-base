/**
 * Tests for ConfigManager.
 */

import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ConfigManager } from "./config.js";

describe("ConfigManager", () => {
	let testDir: string;

	beforeEach(() => {
		testDir = join(tmpdir(), `cli-base-test-${Date.now()}`);
		mkdirSync(testDir, { recursive: true });
	});

	afterEach(() => {
		rmSync(testDir, { recursive: true, force: true });
	});

	describe("constructor", () => {
		it("creates instance with production config path", () => {
			const manager = new ConfigManager<{ token?: string }>(testDir);
			expect(manager.configDir).toBe(testDir);
			expect(manager.configPath).toContain("config.json");
			expect(manager.configPath).not.toContain("dev");
		});

		it("creates instance with dev config path when isDev=true", () => {
			const manager = new ConfigManager<{ token?: string }>(testDir, true);
			expect(manager.configPath).toContain("config.dev.json");
		});

		it("accepts custom config filenames", () => {
			const manager = new ConfigManager<{ token?: string }>(testDir, false, {
				prodFilename: "settings.json",
				devFilename: "settings.dev.json",
			});
			expect(manager.configPath).toContain("settings.json");
		});
	});

	describe("read", () => {
		it("returns empty object when config file does not exist", () => {
			const manager = new ConfigManager<{ token?: string }>(testDir);
			const config = manager.read();
			expect(config).toEqual({});
		});

		it("returns parsed config when file exists", () => {
			const manager = new ConfigManager<{ token?: string }>(testDir);
			manager.write({ token: "test-token" });

			const config = manager.read();
			expect(config).toEqual({ token: "test-token" });
		});

		it("returns empty object when file contains invalid JSON", () => {
			const manager = new ConfigManager<{ token?: string }>(testDir);
			mkdirSync(testDir, { recursive: true });
			const fs = require("node:fs");
			fs.writeFileSync(manager.configPath, "invalid json {{{", "utf-8");

			const config = manager.read();
			expect(config).toEqual({});
		});
	});

	describe("write", () => {
		it("creates config directory if it does not exist", () => {
			const nestedDir = join(testDir, "nested", "config");
			const manager = new ConfigManager<{ token?: string }>(nestedDir);

			manager.write({ token: "test" });

			expect(existsSync(nestedDir)).toBe(true);
		});

		it("merges with existing config", () => {
			const manager = new ConfigManager<{ token?: string; deviceId?: string }>(
				testDir,
			);
			manager.write({ token: "token1" });
			manager.write({ deviceId: "device1" });

			const config = manager.read();
			expect(config).toEqual({ token: "token1", deviceId: "device1" });
		});

		it("overwrites existing values", () => {
			const manager = new ConfigManager<{ token?: string }>(testDir);
			manager.write({ token: "old" });
			manager.write({ token: "new" });

			const config = manager.read();
			expect(config.token).toBe("new");
		});

		it("sets file permissions to 0600", () => {
			const manager = new ConfigManager<{ token?: string }>(testDir);
			manager.write({ token: "secret" });

			const fs = require("node:fs");
			const stats = fs.statSync(manager.configPath);
			// 0600 = 384 in decimal, but check just the permission bits
			expect(stats.mode & 0o777).toBe(0o600);
		});

		it("formats JSON with 2-space indentation", () => {
			const manager = new ConfigManager<{ token?: string }>(testDir);
			manager.write({ token: "test" });

			const content = readFileSync(manager.configPath, "utf-8");
			expect(content).toContain("  ");
			expect(content).toContain("\n");
		});
	});

	describe("readAsync / writeAsync", () => {
		it("reads config asynchronously", async () => {
			const manager = new ConfigManager<{ token?: string }>(testDir);
			manager.write({ token: "async-test" });

			const config = await manager.readAsync();
			expect(config.token).toBe("async-test");
		});

		it("writes config asynchronously", async () => {
			const manager = new ConfigManager<{ token?: string }>(testDir);
			await manager.writeAsync({ token: "async-write" });

			const config = manager.read();
			expect(config.token).toBe("async-write");
		});

		it("returns empty object when file does not exist (async)", async () => {
			const manager = new ConfigManager<{ token?: string }>(testDir);
			const config = await manager.readAsync();
			expect(config).toEqual({});
		});
	});

	describe("delete", () => {
		it("removes the config file", () => {
			const manager = new ConfigManager<{ token?: string }>(testDir);
			manager.write({ token: "to-delete" });
			expect(existsSync(manager.configPath)).toBe(true);

			manager.delete();
			expect(existsSync(manager.configPath)).toBe(false);
		});

		it("does not throw when file does not exist", () => {
			const manager = new ConfigManager<{ token?: string }>(testDir);
			expect(() => manager.delete()).not.toThrow();
		});
	});

	describe("deleteAsync", () => {
		it("removes the config file asynchronously", async () => {
			const manager = new ConfigManager<{ token?: string }>(testDir);
			manager.write({ token: "to-delete" });
			expect(existsSync(manager.configPath)).toBe(true);

			await manager.deleteAsync();
			expect(existsSync(manager.configPath)).toBe(false);
		});

		it("does not throw when file does not exist (async)", async () => {
			const manager = new ConfigManager<{ token?: string }>(testDir);
			await expect(manager.deleteAsync()).resolves.toBeUndefined();
		});
	});

	describe("exists", () => {
		it("returns false when config file does not exist", () => {
			const manager = new ConfigManager<{ token?: string }>(testDir);
			expect(manager.exists()).toBe(false);
		});

		it("returns true when config file exists", () => {
			const manager = new ConfigManager<{ token?: string }>(testDir);
			manager.write({ token: "test" });
			expect(manager.exists()).toBe(true);
		});
	});

	describe("get / set helpers", () => {
		it("gets a specific key", () => {
			const manager = new ConfigManager<{ token?: string; count?: number }>(
				testDir,
			);
			manager.write({ token: "test", count: 42 });

			expect(manager.get("token")).toBe("test");
			expect(manager.get("count")).toBe(42);
		});

		it("returns undefined for missing keys", () => {
			const manager = new ConfigManager<{ token?: string }>(testDir);
			expect(manager.get("token")).toBeUndefined();
		});

		it("sets a specific key", () => {
			const manager = new ConfigManager<{ token?: string }>(testDir);
			manager.set("token", "new-value");

			expect(manager.get("token")).toBe("new-value");
		});
	});
});
