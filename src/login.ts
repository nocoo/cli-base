/**
 * Browser-based OAuth login flow for CLI applications.
 *
 * Flow:
 * 1. Start local HTTP server on random port (127.0.0.1 only)
 * 2. Open browser to SaaS auth endpoint with callback URL
 * 3. SaaS authenticates user and redirects back with api_key
 * 4. Save token and close server
 *
 * Security:
 * - Loopback-only binding prevents LAN exposure
 * - HTML output is entity-escaped to prevent reflected XSS
 */

import http from "node:http";

export interface LoginDeps {
	/** Function to open URL in browser */
	openBrowser: (url: string) => Promise<void>;
	/** Function to save the received token */
	onSaveToken: (token: string) => void;
	/** Base URL of the SaaS API */
	apiUrl: string;
	/** Timeout in milliseconds */
	timeoutMs: number;
	/** Optional logging function */
	log?: (msg: string) => void;
}

export interface LoginResult {
	success: boolean;
	email?: string;
	error?: string;
}

/**
 * Escape HTML special characters to prevent reflected XSS.
 */
export function escapeHtml(str: string): string {
	return str
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");
}

/**
 * Perform browser-based OAuth login flow.
 *
 * @param deps - Dependencies for the login flow
 * @returns Promise resolving to login result
 */
export function performLogin(deps: LoginDeps): Promise<LoginResult> {
	return new Promise((resolve) => {
		const { openBrowser, onSaveToken, apiUrl, timeoutMs, log } = deps;

		const server = http.createServer((req, res) => {
			const url = new URL(req.url ?? "/", "http://localhost");

			if (url.pathname !== "/callback") {
				res.writeHead(404, { "Content-Type": "text/plain" });
				res.end("Not found");
				return;
			}

			const apiKey = url.searchParams.get("api_key");
			const email = url.searchParams.get("email");

			if (!apiKey) {
				res.writeHead(400, { "Content-Type": "text/plain" });
				res.end("Missing api_key");
				cleanup();
				resolve({ success: false, error: "No api_key received" });
				return;
			}

			// Save the token
			onSaveToken(apiKey);

			res.writeHead(200, { "Content-Type": "text/html" });
			res.end(
				"<html><body><h1>Login successful!</h1><p>You can close this window.</p></body></html>",
			);

			cleanup();
			resolve({ success: true, email: email || undefined });
		});

		// Listen on random port, loopback only
		server.listen(0, "127.0.0.1", () => {
			const addr = server.address();
			/* c8 ignore next 4 -- defensive: server.address() can return string on pipe */
			if (!addr || typeof addr === "string") {
				cleanup();
				resolve({ success: false, error: "Failed to start local server" });
				return;
			}

			const callbackUrl = `http://127.0.0.1:${addr.port}/callback`;
			const loginUrl = `${apiUrl}/api/auth/cli?callback=${encodeURIComponent(callbackUrl)}`;

			openBrowser(loginUrl).catch(() => {
				// Browser failed — print URL so user can open manually
				if (log) {
					log(`Could not open browser. Open this URL manually:\n  ${loginUrl}`);
				}
			});
		});

		/* c8 ignore next 3 -- defensive: server error is rare */
		server.on("error", (err) => {
			cleanup();
			resolve({ success: false, error: `Local server error: ${err.message}` });
		});

		// Timeout
		const timer = setTimeout(() => {
			cleanup();
			resolve({
				success: false,
				error: "Login timeout — no response received",
			});
		}, timeoutMs);

		function cleanup() {
			clearTimeout(timer);
			server.close();
		}
	});
}
