/**
 * Tests for login flow utilities.
 */

import http from "node:http";
import { describe, expect, it, vi } from "vitest";
import {
	type LoginDeps,
	defaultGenerateNonce,
	escapeHtml,
	performLogin,
} from "./login.js";

describe("login", () => {
	describe("escapeHtml", () => {
		it("escapes ampersand", () => {
			expect(escapeHtml("a & b")).toBe("a &amp; b");
		});

		it("escapes less than", () => {
			expect(escapeHtml("a < b")).toBe("a &lt; b");
		});

		it("escapes greater than", () => {
			expect(escapeHtml("a > b")).toBe("a &gt; b");
		});

		it("escapes double quotes", () => {
			expect(escapeHtml('a "b" c')).toBe("a &quot;b&quot; c");
		});

		it("escapes single quotes", () => {
			expect(escapeHtml("a 'b' c")).toBe("a &#39;b&#39; c");
		});

		it("escapes multiple special characters", () => {
			expect(escapeHtml("<script>\"alert('xss')\"</script>")).toBe(
				"&lt;script&gt;&quot;alert(&#39;xss&#39;)&quot;&lt;/script&gt;",
			);
		});

		it("returns unchanged string with no special characters", () => {
			expect(escapeHtml("hello world")).toBe("hello world");
		});
	});

	describe("defaultGenerateNonce", () => {
		it("generates a 32-character hex string", () => {
			const nonce = defaultGenerateNonce();
			expect(nonce).toMatch(/^[a-f0-9]{32}$/);
		});

		it("generates unique values on each call", () => {
			const nonce1 = defaultGenerateNonce();
			const nonce2 = defaultGenerateNonce();
			expect(nonce1).not.toBe(nonce2);
		});
	});

	describe("performLogin", () => {
		// Helper to extract state from URL
		function extractState(url: string): string {
			const match = url.match(/state=([^&]+)/);
			return match ? decodeURIComponent(match[1]) : "";
		}

		// Helper to extract callback URL from browser URL
		function extractCallbackUrl(url: string): string {
			const match = url.match(/callback=([^&]+)/);
			return match ? decodeURIComponent(match[1]) : "";
		}

		it("starts a local server and opens browser with state", async () => {
			const openBrowser = vi.fn().mockResolvedValue(undefined);
			const onSaveToken = vi.fn();
			const testState = "test-state-123";

			const loginPromise = performLogin({
				openBrowser,
				onSaveToken,
				apiUrl: "https://example.com",
				timeoutMs: 5000,
				generateNonce: () => testState,
			});

			await new Promise((resolve) => setTimeout(resolve, 100));

			expect(openBrowser).toHaveBeenCalledTimes(1);
			const url = openBrowser.mock.calls[0][0] as string;
			expect(url).toContain("https://example.com");
			expect(url).toContain("/api/auth/cli");
			expect(url).toContain("callback=");
			expect(url).toContain(`state=${testState}`);

			// Extract callback URL and port
			const callbackUrl = extractCallbackUrl(url);
			const callbackParsed = new URL(callbackUrl);
			const port = callbackParsed.port;

			// Make callback request with correct state
			await new Promise<void>((resolve, reject) => {
				const req = http.request(
					{
						hostname: "localhost",
						port: Number(port),
						path: `/callback?api_key=test-token&email=test@example.com&state=${testState}`,
						method: "GET",
					},
					(res) => {
						let data = "";
						res.on("data", (chunk) => {
							data += chunk;
						});
						res.on("end", () => {
							expect(res.statusCode).toBe(200);
							expect(data).toContain("Login Successful");
							resolve();
						});
					},
				);
				req.on("error", reject);
				req.end();
			});

			const result = await loginPromise;

			expect(result.success).toBe(true);
			expect(result.email).toBe("test@example.com");
			expect(onSaveToken).toHaveBeenCalledWith("test-token");
		});

		it("returns error when callback has no api_key", async () => {
			const openBrowser = vi.fn().mockResolvedValue(undefined);
			const onSaveToken = vi.fn();
			const testState = "test-state-456";

			const loginPromise = performLogin({
				openBrowser,
				onSaveToken,
				apiUrl: "https://example.com",
				timeoutMs: 5000,
				generateNonce: () => testState,
			});

			await new Promise((resolve) => setTimeout(resolve, 100));

			const url = openBrowser.mock.calls[0][0] as string;
			const callbackUrl = extractCallbackUrl(url);
			const callbackParsed = new URL(callbackUrl);
			const port = callbackParsed.port;

			// Make callback without api_key but with state
			await new Promise<void>((resolve) => {
				const req = http.request(
					{
						hostname: "localhost",
						port: Number(port),
						path: `/callback?state=${testState}`,
						method: "GET",
					},
					(res) => {
						expect(res.statusCode).toBe(400);
						resolve();
					},
				);
				req.on("error", () => resolve());
				req.end();
			});

			const result = await loginPromise;
			expect(result.success).toBe(false);
			expect(result.error).toContain("api_key");
		});

		it("times out when no callback received", async () => {
			const openBrowser = vi.fn().mockResolvedValue(undefined);
			const onSaveToken = vi.fn();

			const result = await performLogin({
				openBrowser,
				onSaveToken,
				apiUrl: "https://example.com",
				timeoutMs: 100, // Very short timeout
			});

			expect(result.success).toBe(false);
			expect(result.error).toContain("timeout");
		});

		it("logs URL when browser fails to open", async () => {
			const openBrowser = vi.fn().mockRejectedValue(new Error("No browser"));
			const onSaveToken = vi.fn();
			const log = vi.fn();

			const loginPromise = performLogin({
				openBrowser,
				onSaveToken,
				apiUrl: "https://example.com",
				timeoutMs: 100,
				log,
			});

			await new Promise((resolve) => setTimeout(resolve, 50));

			expect(log).toHaveBeenCalled();
			const logMsg = log.mock.calls[0][0] as string;
			expect(logMsg).toContain("manually");

			await loginPromise; // Let it timeout
		});

		it("returns 404 for non-callback paths", async () => {
			const openBrowser = vi.fn().mockResolvedValue(undefined);
			const onSaveToken = vi.fn();
			const testState = "test-state-789";

			const loginPromise = performLogin({
				openBrowser,
				onSaveToken,
				apiUrl: "https://example.com",
				timeoutMs: 5000,
				generateNonce: () => testState,
			});

			await new Promise((resolve) => setTimeout(resolve, 100));

			const url = openBrowser.mock.calls[0][0] as string;
			const callbackUrl = extractCallbackUrl(url);
			const callbackParsed = new URL(callbackUrl);
			const port = callbackParsed.port;

			// Request non-callback path
			await new Promise<void>((resolve) => {
				const req = http.request(
					{
						hostname: "localhost",
						port: Number(port),
						path: "/other",
						method: "GET",
					},
					(res) => {
						expect(res.statusCode).toBe(404);
						resolve();
					},
				);
				req.on("error", () => resolve());
				req.end();
			});

			// Now send proper callback to complete
			await new Promise<void>((resolve) => {
				const req = http.request(
					{
						hostname: "localhost",
						port: Number(port),
						path: `/callback?api_key=token&state=${testState}`,
						method: "GET",
					},
					() => resolve(),
				);
				req.end();
			});

			await loginPromise;
		});

		it("uses custom tokenParam when specified", async () => {
			const openBrowser = vi.fn().mockResolvedValue(undefined);
			const onSaveToken = vi.fn();
			const testState = "test-state-custom";

			const loginPromise = performLogin({
				openBrowser,
				onSaveToken,
				apiUrl: "https://example.com",
				timeoutMs: 5000,
				tokenParam: "token",
				generateNonce: () => testState,
			});

			await new Promise((resolve) => setTimeout(resolve, 100));

			const url = openBrowser.mock.calls[0][0] as string;
			const callbackUrl = extractCallbackUrl(url);
			const callbackParsed = new URL(callbackUrl);
			const port = callbackParsed.port;

			// Make callback with custom token param
			await new Promise<void>((resolve, reject) => {
				const req = http.request(
					{
						hostname: "localhost",
						port: Number(port),
						path: `/callback?token=custom-token&state=${testState}`,
						method: "GET",
					},
					(res) => {
						expect(res.statusCode).toBe(200);
						resolve();
					},
				);
				req.on("error", reject);
				req.end();
			});

			const result = await loginPromise;
			expect(result.success).toBe(true);
			expect(onSaveToken).toHaveBeenCalledWith("custom-token");
		});

		it("uses custom loginPath when specified", async () => {
			const openBrowser = vi.fn().mockResolvedValue(undefined);
			const onSaveToken = vi.fn();
			const testState = "test-state-path";

			const loginPromise = performLogin({
				openBrowser,
				onSaveToken,
				apiUrl: "https://example.com",
				timeoutMs: 5000,
				loginPath: "/cli/connect",
				generateNonce: () => testState,
			});

			await new Promise((resolve) => setTimeout(resolve, 100));

			const url = openBrowser.mock.calls[0][0] as string;
			expect(url).toContain("/cli/connect");
			expect(url).not.toContain("/api/auth/cli");

			// Complete the login
			const callbackUrl = extractCallbackUrl(url);
			const callbackParsed = new URL(callbackUrl);
			const port = callbackParsed.port;

			await new Promise<void>((resolve) => {
				const req = http.request(
					{
						hostname: "localhost",
						port: Number(port),
						path: `/callback?api_key=token&state=${testState}`,
						method: "GET",
					},
					() => resolve(),
				);
				req.end();
			});

			await loginPromise;
		});

		it("returns error HTML when token missing with custom param name", async () => {
			const openBrowser = vi.fn().mockResolvedValue(undefined);
			const onSaveToken = vi.fn();
			const testState = "test-state-param";

			const loginPromise = performLogin({
				openBrowser,
				onSaveToken,
				apiUrl: "https://example.com",
				timeoutMs: 5000,
				tokenParam: "custom_token",
				generateNonce: () => testState,
			});

			await new Promise((resolve) => setTimeout(resolve, 100));

			const url = openBrowser.mock.calls[0][0] as string;
			const callbackUrl = extractCallbackUrl(url);
			const callbackParsed = new URL(callbackUrl);
			const port = callbackParsed.port;

			// Make callback without the custom token param (but with state)
			await new Promise<void>((resolve) => {
				const req = http.request(
					{
						hostname: "localhost",
						port: Number(port),
						path: `/callback?state=${testState}`,
						method: "GET",
					},
					(res) => {
						let data = "";
						res.on("data", (chunk) => {
							data += chunk;
						});
						res.on("end", () => {
							expect(res.statusCode).toBe(400);
							expect(data).toContain("Login Failed");
							expect(data).toContain("custom_token");
							resolve();
						});
					},
				);
				req.on("error", () => resolve());
				req.end();
			});

			const result = await loginPromise;
			expect(result.success).toBe(false);
			expect(result.error).toContain("custom_token");
		});

		describe("CSRF state nonce", () => {
			it("always includes state in URL", async () => {
				const openBrowser = vi.fn().mockResolvedValue(undefined);
				const onSaveToken = vi.fn();

				const loginPromise = performLogin({
					openBrowser,
					onSaveToken,
					apiUrl: "https://example.com",
					timeoutMs: 5000,
					generateNonce: () => "test-nonce-123",
				});

				await new Promise((resolve) => setTimeout(resolve, 100));

				const url = openBrowser.mock.calls[0][0] as string;
				expect(url).toContain("state=test-nonce-123");

				// Complete the login with matching state
				const callbackUrl = extractCallbackUrl(url);
				const callbackParsed = new URL(callbackUrl);
				const port = callbackParsed.port;

				await new Promise<void>((resolve) => {
					const req = http.request(
						{
							hostname: "localhost",
							port: Number(port),
							path: "/callback?api_key=token&state=test-nonce-123",
							method: "GET",
						},
						() => resolve(),
					);
					req.end();
				});

				const result = await loginPromise;
				expect(result.success).toBe(true);
			});

			it("rejects callback with wrong state", async () => {
				const openBrowser = vi.fn().mockResolvedValue(undefined);
				const onSaveToken = vi.fn();

				const loginPromise = performLogin({
					openBrowser,
					onSaveToken,
					apiUrl: "https://example.com",
					timeoutMs: 5000,
					generateNonce: () => "expected-state",
				});

				await new Promise((resolve) => setTimeout(resolve, 100));

				const url = openBrowser.mock.calls[0][0] as string;
				const callbackUrl = extractCallbackUrl(url);
				const callbackParsed = new URL(callbackUrl);
				const port = callbackParsed.port;

				// Make callback with wrong state
				await new Promise<void>((resolve) => {
					const req = http.request(
						{
							hostname: "localhost",
							port: Number(port),
							path: "/callback?api_key=token&state=wrong-state",
							method: "GET",
						},
						(res) => {
							expect(res.statusCode).toBe(403);
							resolve();
						},
					);
					req.on("error", () => resolve());
					req.end();
				});

				const result = await loginPromise;
				expect(result.success).toBe(false);
				expect(result.error).toContain("CSRF");
				expect(onSaveToken).not.toHaveBeenCalled();
			});

			it("rejects callback with missing state", async () => {
				const openBrowser = vi.fn().mockResolvedValue(undefined);
				const onSaveToken = vi.fn();

				const loginPromise = performLogin({
					openBrowser,
					onSaveToken,
					apiUrl: "https://example.com",
					timeoutMs: 5000,
					generateNonce: () => "expected-state",
				});

				await new Promise((resolve) => setTimeout(resolve, 100));

				const url = openBrowser.mock.calls[0][0] as string;
				const callbackUrl = extractCallbackUrl(url);
				const callbackParsed = new URL(callbackUrl);
				const port = callbackParsed.port;

				// Make callback without state
				await new Promise<void>((resolve) => {
					const req = http.request(
						{
							hostname: "localhost",
							port: Number(port),
							path: "/callback?api_key=token",
							method: "GET",
						},
						(res) => {
							expect(res.statusCode).toBe(403);
							resolve();
						},
					);
					req.on("error", () => resolve());
					req.end();
				});

				const result = await loginPromise;
				expect(result.success).toBe(false);
				expect(result.error).toContain("CSRF");
			});
		});

		describe("accent color", () => {
			it("uses default gold accent color", async () => {
				const openBrowser = vi.fn().mockResolvedValue(undefined);
				const onSaveToken = vi.fn();
				const testState = "test-state-color";

				const loginPromise = performLogin({
					openBrowser,
					onSaveToken,
					apiUrl: "https://example.com",
					timeoutMs: 5000,
					generateNonce: () => testState,
				});

				await new Promise((resolve) => setTimeout(resolve, 100));

				const url = openBrowser.mock.calls[0][0] as string;
				const callbackUrl = extractCallbackUrl(url);
				const callbackParsed = new URL(callbackUrl);
				const port = callbackParsed.port;

				await new Promise<void>((resolve) => {
					const req = http.request(
						{
							hostname: "localhost",
							port: Number(port),
							path: `/callback?api_key=token&state=${testState}`,
							method: "GET",
						},
						(res) => {
							let data = "";
							res.on("data", (chunk) => {
								data += chunk;
							});
							res.on("end", () => {
								expect(data).toContain("#c9a227"); // default gold
								resolve();
							});
						},
					);
					req.end();
				});

				await loginPromise;
			});

			it("uses custom accent color when specified", async () => {
				const openBrowser = vi.fn().mockResolvedValue(undefined);
				const onSaveToken = vi.fn();
				const testState = "test-state-custom-color";

				const loginPromise = performLogin({
					openBrowser,
					onSaveToken,
					apiUrl: "https://example.com",
					timeoutMs: 5000,
					generateNonce: () => testState,
					accentColor: "#22c55e", // green
				});

				await new Promise((resolve) => setTimeout(resolve, 100));

				const url = openBrowser.mock.calls[0][0] as string;
				const callbackUrl = extractCallbackUrl(url);
				const callbackParsed = new URL(callbackUrl);
				const port = callbackParsed.port;

				await new Promise<void>((resolve) => {
					const req = http.request(
						{
							hostname: "localhost",
							port: Number(port),
							path: `/callback?api_key=token&state=${testState}`,
							method: "GET",
						},
						(res) => {
							let data = "";
							res.on("data", (chunk) => {
								data += chunk;
							});
							res.on("end", () => {
								expect(data).toContain("#22c55e");
								expect(data).not.toContain("#c9a227");
								resolve();
							});
						},
					);
					req.end();
				});

				await loginPromise;
			});
		});
	});
});
