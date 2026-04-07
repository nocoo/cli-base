/**
 * Tests for browser utilities.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getBrowserCommand, openBrowser } from "./browser.js";

describe("browser", () => {
	describe("getBrowserCommand", () => {
		const originalPlatform = process.platform;

		afterEach(() => {
			Object.defineProperty(process, "platform", { value: originalPlatform });
		});

		it("returns 'open' on macOS", () => {
			Object.defineProperty(process, "platform", { value: "darwin" });
			expect(getBrowserCommand()).toBe("open");
		});

		it("returns 'start' on Windows", () => {
			Object.defineProperty(process, "platform", { value: "win32" });
			expect(getBrowserCommand()).toBe("start");
		});

		it("returns 'xdg-open' on Linux", () => {
			Object.defineProperty(process, "platform", { value: "linux" });
			expect(getBrowserCommand()).toBe("xdg-open");
		});

		it("returns 'xdg-open' on unknown platforms", () => {
			Object.defineProperty(process, "platform", { value: "freebsd" });
			expect(getBrowserCommand()).toBe("xdg-open");
		});
	});

	describe("openBrowser", () => {
		it("executes the browser command with the URL", async () => {
			const mockExec = vi.fn(
				(
					_cmd: string,
					callback: (
						error: Error | null,
						stdout: string,
						stderr: string,
					) => void,
				) => {
					callback(null, "", "");
				},
			);

			await openBrowser("https://example.com", mockExec);

			expect(mockExec).toHaveBeenCalledTimes(1);
			const cmd = mockExec.mock.calls[0][0] as string;
			expect(cmd).toContain("https://example.com");
		});

		it("rejects when exec fails", async () => {
			const mockExec = vi.fn(
				(
					_cmd: string,
					callback: (
						error: Error | null,
						stdout: string,
						stderr: string,
					) => void,
				) => {
					callback(new Error("Browser not found"), "", "");
				},
			);

			await expect(
				openBrowser("https://example.com", mockExec),
			).rejects.toThrow("Browser not found");
		});

		it("properly escapes URLs with special characters", async () => {
			const mockExec = vi.fn(
				(
					_cmd: string,
					callback: (
						error: Error | null,
						stdout: string,
						stderr: string,
					) => void,
				) => {
					callback(null, "", "");
				},
			);

			await openBrowser(
				"https://example.com/callback?code=abc&state=xyz",
				mockExec,
			);

			const cmd = mockExec.mock.calls[0][0] as string;
			expect(cmd).toContain("https://example.com/callback?code=abc&state=xyz");
		});

		describe("Windows-specific behavior", () => {
			const originalPlatform = process.platform;

			beforeEach(() => {
				Object.defineProperty(process, "platform", { value: "win32" });
			});

			afterEach(() => {
				Object.defineProperty(process, "platform", { value: originalPlatform });
			});

			it("uses empty title before URL to avoid start command quirk", async () => {
				const mockExec = vi.fn(
					(
						_cmd: string,
						callback: (
							error: Error | null,
							stdout: string,
							stderr: string,
						) => void,
					) => {
						callback(null, "", "");
					},
				);

				await openBrowser("https://example.com/auth?code=abc", mockExec);

				const cmd = mockExec.mock.calls[0][0] as string;
				// Windows 'start' treats first quoted arg as window title.
				// Must use: start "" "url" (empty title before URL)
				expect(cmd).toBe('start "" "https://example.com/auth?code=abc"');
			});
		});

		describe("non-Windows behavior", () => {
			const originalPlatform = process.platform;

			beforeEach(() => {
				Object.defineProperty(process, "platform", { value: "darwin" });
			});

			afterEach(() => {
				Object.defineProperty(process, "platform", { value: originalPlatform });
			});

			it("does not add empty title on macOS", async () => {
				const mockExec = vi.fn(
					(
						_cmd: string,
						callback: (
							error: Error | null,
							stdout: string,
							stderr: string,
						) => void,
					) => {
						callback(null, "", "");
					},
				);

				await openBrowser("https://example.com", mockExec);

				const cmd = mockExec.mock.calls[0][0] as string;
				expect(cmd).toBe('open "https://example.com"');
			});
		});
	});
});
