/**
 * Tests for update command utilities.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	type PackageManager,
	detectPackageManager,
	getLatestVersion,
	getUpdateCommand,
} from "./update.js";

describe("update", () => {
	describe("detectPackageManager", () => {
		it("returns bun when package is in bun global list", () => {
			const mockExec = vi.fn((cmd: string) => {
				if (cmd.includes("bun pm ls -g")) {
					return "@nocoo/test-cli@1.0.0";
				}
				throw new Error("Not found");
			});

			const result = detectPackageManager("@nocoo/test-cli", mockExec);
			expect(result).toBe("bun");
		});

		it("returns pnpm when package is in pnpm global list", () => {
			const mockExec = vi.fn((cmd: string) => {
				if (cmd.includes("bun pm ls -g")) {
					return ""; // not in bun
				}
				if (cmd.includes("pnpm list -g")) {
					return "@nocoo/test-cli@1.0.0";
				}
				throw new Error("Not found");
			});

			const result = detectPackageManager("@nocoo/test-cli", mockExec);
			expect(result).toBe("pnpm");
		});

		it("returns yarn when package is in yarn global list", () => {
			const mockExec = vi.fn((cmd: string) => {
				if (cmd.includes("bun pm ls -g")) return "";
				if (cmd.includes("pnpm list -g")) return "";
				if (cmd.includes("yarn global list")) {
					return "@nocoo/test-cli@1.0.0";
				}
				throw new Error("Not found");
			});

			const result = detectPackageManager("@nocoo/test-cli", mockExec);
			expect(result).toBe("yarn");
		});

		it("returns npm when package is in npm global list", () => {
			const mockExec = vi.fn((cmd: string) => {
				if (cmd.includes("bun pm ls -g")) return "";
				if (cmd.includes("pnpm list -g")) return "";
				if (cmd.includes("yarn global list")) return "";
				if (cmd.includes("npm list -g")) {
					return "@nocoo/test-cli@1.0.0";
				}
				throw new Error("Not found");
			});

			const result = detectPackageManager("@nocoo/test-cli", mockExec);
			expect(result).toBe("npm");
		});

		it("returns null when package is not found in any manager", () => {
			const mockExec = vi.fn((_cmd: string) => {
				return ""; // empty output, package not found
			});

			const result = detectPackageManager("@nocoo/test-cli", mockExec);
			expect(result).toBeNull();
		});

		it("handles exec errors gracefully", () => {
			const mockExec = vi.fn((_cmd: string) => {
				throw new Error("Command failed");
			});

			const result = detectPackageManager("@nocoo/test-cli", mockExec);
			expect(result).toBeNull();
		});
	});

	describe("getLatestVersion", () => {
		it("fetches latest version from npm registry", async () => {
			const mockFetch = vi.fn().mockResolvedValue({
				ok: true,
				json: async () => ({ version: "2.0.0" }),
			});

			const result = await getLatestVersion("@nocoo/test-cli", mockFetch);
			expect(result).toBe("2.0.0");
			expect(mockFetch).toHaveBeenCalledWith(
				"https://registry.npmjs.org/@nocoo/test-cli/latest",
			);
		});

		it("returns null when fetch fails", async () => {
			const mockFetch = vi.fn().mockResolvedValue({
				ok: false,
				status: 404,
			});

			const result = await getLatestVersion("@nocoo/test-cli", mockFetch);
			expect(result).toBeNull();
		});

		it("returns null when fetch throws", async () => {
			const mockFetch = vi.fn().mockRejectedValue(new Error("Network error"));

			const result = await getLatestVersion("@nocoo/test-cli", mockFetch);
			expect(result).toBeNull();
		});
	});

	describe("getUpdateCommand", () => {
		const packageName = "@nocoo/test-cli";

		it("returns correct npm command", () => {
			expect(getUpdateCommand("npm", packageName)).toBe(
				"npm update -g @nocoo/test-cli",
			);
		});

		it("returns correct bun command", () => {
			expect(getUpdateCommand("bun", packageName)).toBe(
				"bun update -g @nocoo/test-cli",
			);
		});

		it("returns correct pnpm command", () => {
			expect(getUpdateCommand("pnpm", packageName)).toBe(
				"pnpm update -g @nocoo/test-cli",
			);
		});

		it("returns correct yarn command", () => {
			expect(getUpdateCommand("yarn", packageName)).toBe(
				"yarn global upgrade @nocoo/test-cli",
			);
		});
	});
});
