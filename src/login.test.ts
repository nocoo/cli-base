/**
 * Tests for login flow utilities.
 */

import http from "node:http";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type LoginDeps, escapeHtml, performLogin } from "./login.js";

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

	describe("performLogin", () => {
		it("starts a local server and opens browser", async () => {
			const openBrowser = vi.fn().mockResolvedValue(undefined);
			const onSaveToken = vi.fn();

			// Start the login flow
			const loginPromise = performLogin({
				openBrowser,
				onSaveToken,
				apiUrl: "https://example.com",
				timeoutMs: 5000,
			});

			// Wait for server to start
			await new Promise((resolve) => setTimeout(resolve, 100));

			// Verify browser was opened with correct URL
			expect(openBrowser).toHaveBeenCalledTimes(1);
			const url = openBrowser.mock.calls[0][0] as string;
			expect(url).toContain("https://example.com");
			expect(url).toContain("/api/auth/cli");
			expect(url).toContain("callback=");

			// Extract callback URL and simulate callback
			const callbackMatch = url.match(/callback=([^&]+)/);
			expect(callbackMatch).toBeTruthy();
			const callbackUrl = decodeURIComponent(callbackMatch?.[1] ?? "");

			// Make callback request
			const callbackParsed = new URL(callbackUrl);
			const port = callbackParsed.port;

			await new Promise<void>((resolve, reject) => {
				const req = http.request(
					{
						hostname: "127.0.0.1",
						port: Number(port),
						path: "/callback?api_key=test-token&email=test@example.com",
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

			// Wait for login to complete
			const result = await loginPromise;

			expect(result.success).toBe(true);
			expect(result.email).toBe("test@example.com");
			expect(onSaveToken).toHaveBeenCalledWith("test-token");
		});

		it("returns error when callback has no api_key", async () => {
			const openBrowser = vi.fn().mockResolvedValue(undefined);
			const onSaveToken = vi.fn();

			const loginPromise = performLogin({
				openBrowser,
				onSaveToken,
				apiUrl: "https://example.com",
				timeoutMs: 5000,
			});

			await new Promise((resolve) => setTimeout(resolve, 100));

			const url = openBrowser.mock.calls[0][0] as string;
			const callbackMatch = url.match(/callback=([^&]+)/);
			const callbackUrl = decodeURIComponent(callbackMatch?.[1] ?? "");
			const callbackParsed = new URL(callbackUrl);
			const port = callbackParsed.port;

			// Make callback without api_key
			await new Promise<void>((resolve) => {
				const req = http.request(
					{
						hostname: "127.0.0.1",
						port: Number(port),
						path: "/callback",
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

			const loginPromise = performLogin({
				openBrowser,
				onSaveToken,
				apiUrl: "https://example.com",
				timeoutMs: 5000,
			});

			await new Promise((resolve) => setTimeout(resolve, 100));

			const url = openBrowser.mock.calls[0][0] as string;
			const callbackMatch = url.match(/callback=([^&]+)/);
			const callbackUrl = decodeURIComponent(callbackMatch?.[1] ?? "");
			const callbackParsed = new URL(callbackUrl);
			const port = callbackParsed.port;

			// Request non-callback path
			await new Promise<void>((resolve) => {
				const req = http.request(
					{
						hostname: "127.0.0.1",
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
						hostname: "127.0.0.1",
						port: Number(port),
						path: "/callback?api_key=token",
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

			const loginPromise = performLogin({
				openBrowser,
				onSaveToken,
				apiUrl: "https://example.com",
				timeoutMs: 5000,
				tokenParam: "token",
			});

			await new Promise((resolve) => setTimeout(resolve, 100));

			const url = openBrowser.mock.calls[0][0] as string;
			const callbackMatch = url.match(/callback=([^&]+)/);
			const callbackUrl = decodeURIComponent(callbackMatch?.[1] ?? "");
			const callbackParsed = new URL(callbackUrl);
			const port = callbackParsed.port;

			// Make callback with custom token param
			await new Promise<void>((resolve, reject) => {
				const req = http.request(
					{
						hostname: "127.0.0.1",
						port: Number(port),
						path: "/callback?token=custom-token",
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

			const loginPromise = performLogin({
				openBrowser,
				onSaveToken,
				apiUrl: "https://example.com",
				timeoutMs: 5000,
				loginPath: "/cli/connect",
			});

			await new Promise((resolve) => setTimeout(resolve, 100));

			const url = openBrowser.mock.calls[0][0] as string;
			expect(url).toContain("/cli/connect");
			expect(url).not.toContain("/api/auth/cli");

			// Complete the login
			const callbackMatch = url.match(/callback=([^&]+)/);
			const callbackUrl = decodeURIComponent(callbackMatch?.[1] ?? "");
			const callbackParsed = new URL(callbackUrl);
			const port = callbackParsed.port;

			await new Promise<void>((resolve) => {
				const req = http.request(
					{
						hostname: "127.0.0.1",
						port: Number(port),
						path: "/callback?api_key=token",
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

			const loginPromise = performLogin({
				openBrowser,
				onSaveToken,
				apiUrl: "https://example.com",
				timeoutMs: 5000,
				tokenParam: "custom_token",
			});

			await new Promise((resolve) => setTimeout(resolve, 100));

			const url = openBrowser.mock.calls[0][0] as string;
			const callbackMatch = url.match(/callback=([^&]+)/);
			const callbackUrl = decodeURIComponent(callbackMatch?.[1] ?? "");
			const callbackParsed = new URL(callbackUrl);
			const port = callbackParsed.port;

			// Make callback without the custom token param
			await new Promise<void>((resolve) => {
				const req = http.request(
					{
						hostname: "127.0.0.1",
						port: Number(port),
						path: "/callback",
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
	});
});
