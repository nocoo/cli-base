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
 * - Optional CSRF state nonce prevents forged callbacks
 */

import { randomBytes } from "node:crypto";
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
	/**
	 * Query parameter name for the token in the callback URL.
	 * Defaults to "api_key".
	 */
	tokenParam?: string;
	/**
	 * Login endpoint path appended to apiUrl.
	 * Defaults to "/api/auth/cli".
	 */
	loginPath?: string;
	/**
	 * Custom nonce generator for testing.
	 */
	generateNonce?: () => string;
	/**
	 * Theme accent color for the success page checkmark icon.
	 * Accepts any valid CSS color (hex, rgb, hsl, named colors).
	 * Defaults to "#c9a227" (gold).
	 */
	accentColor?: string;
}

export interface LoginResult {
	success: boolean;
	email?: string;
	error?: string;
	/**
	 * All query parameters from the callback URL.
	 * Useful for extracting additional data beyond the token.
	 */
	params?: Record<string, string>;
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
 * Generate a cryptographically secure random nonce.
 */
export function defaultGenerateNonce(): string {
	return randomBytes(16).toString("hex");
}

/**
 * Perform browser-based OAuth login flow.
 *
 * @param deps - Dependencies for the login flow
 * @returns Promise resolving to login result
 */
export function performLogin(deps: LoginDeps): Promise<LoginResult> {
	return new Promise((resolve) => {
		const {
			openBrowser,
			onSaveToken,
			apiUrl,
			timeoutMs,
			log,
			tokenParam = "api_key",
			loginPath = "/api/auth/cli",
			generateNonce = defaultGenerateNonce,
			accentColor = "#c9a227",
		} = deps;

		// Always generate state nonce for CSRF protection
		const expectedState = generateNonce();

		const server = http.createServer((req, res) => {
			const url = new URL(req.url ?? "/", "http://localhost");

			if (url.pathname !== "/callback") {
				res.writeHead(404, { "Content-Type": "text/plain" });
				res.end("Not found");
				return;
			}

			// Validate CSRF state nonce
			const state = url.searchParams.get("state");
			if (state !== expectedState) {
				res.writeHead(403, { "Content-Type": "text/html" });
				res.end(
					errorHtml(
						"Invalid or missing state parameter. This may be a forged request.",
					),
				);
				cleanup();
				resolve({
					success: false,
					error: "State mismatch — possible CSRF attempt",
				});
				return;
			}

			const token = url.searchParams.get(tokenParam);
			const email = url.searchParams.get("email");

			if (!token) {
				res.writeHead(400, { "Content-Type": "text/html" });
				res.end(errorHtml(`Missing ${tokenParam}`));
				cleanup();
				resolve({ success: false, error: `No ${tokenParam} received` });
				return;
			}

			// Save the token
			onSaveToken(token);

			res.writeHead(200, { "Content-Type": "text/html" });
			res.end(successHtml(accentColor));

			cleanup();

			// Build params object from all query parameters
			const params: Record<string, string> = {};
			for (const [key, value] of url.searchParams.entries()) {
				params[key] = value;
			}

			const result: LoginResult = { success: true, params };
			if (email) {
				result.email = email;
			}
			resolve(result);
		});

		// Track which hostname we successfully bound to
		let boundHost: string;

		// Try binding to "localhost" first, fallback to "127.0.0.1" on error.
		// On most systems, "localhost" works and matches browser resolution.
		// In IPv6-restricted environments (sandboxes, some CI), localhost may
		// resolve to ::1 which fails with EPERM/EADDRNOTAVAIL — fall back to IPv4.
		function tryListen(host: string, fallbackHost?: string) {
			server.listen(0, host, () => {
				boundHost = host;
				onListening();
			});

			server.once("error", (err: NodeJS.ErrnoException) => {
				if (
					fallbackHost &&
					(err.code === "EPERM" ||
						err.code === "EADDRNOTAVAIL" ||
						err.code === "EAFNOSUPPORT")
				) {
					// IPv6 not available, try IPv4
					server.removeAllListeners("error");
					tryListen(fallbackHost);
				} else {
					cleanup();
					resolve({
						success: false,
						error: `Local server error: ${err.message}`,
					});
				}
			});
		}

		function onListening() {
			const addr = server.address();
			/* c8 ignore next 4 -- defensive: server.address() can return string on pipe */
			if (!addr || typeof addr === "string") {
				cleanup();
				resolve({ success: false, error: "Failed to start local server" });
				return;
			}

			const callbackUrl = `http://${boundHost}:${addr.port}/callback`;
			const loginUrl = `${apiUrl}${loginPath}?callback=${encodeURIComponent(callbackUrl)}&state=${encodeURIComponent(expectedState)}`;

			openBrowser(loginUrl).catch(() => {
				// Browser failed — print URL so user can open manually
				if (log) {
					log(`Could not open browser. Open this URL manually:\n  ${loginUrl}`);
				}
			});
		}

		// Start with localhost, fallback to 127.0.0.1
		tryListen("localhost", "127.0.0.1");

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

// ---------------------------------------------------------------------------
// HTML templates for callback responses (basalt design system)
// ---------------------------------------------------------------------------

function successHtml(accentColor: string): string {
	// Escape the color to prevent XSS (though it should be a safe CSS color)
	const safeColor = escapeHtml(accentColor);
	return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Login Successful</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #171717;
      color: #e5e5e5;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .container {
      text-align: center;
      padding: 2rem;
    }
    .icon {
      width: 64px;
      height: 64px;
      margin: 0 auto 1.5rem;
      background: #1f1f1f;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .icon svg {
      width: 32px;
      height: 32px;
      color: ${safeColor};
    }
    h1 {
      font-size: 1.5rem;
      font-weight: 600;
      margin-bottom: 0.5rem;
      color: #fafafa;
    }
    p {
      font-size: 0.875rem;
      color: #737373;
      margin-bottom: 1.5rem;
    }
    .hint {
      font-size: 0.75rem;
      color: #525252;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    </div>
    <h1>Login Successful</h1>
    <p>You have been authenticated.</p>
    <p class="hint">You can close this window.</p>
  </div>
</body>
</html>`;
}

function errorHtml(message: string): string {
	const escaped = escapeHtml(message);
	return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Login Failed</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #171717;
      color: #e5e5e5;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .container {
      text-align: center;
      padding: 2rem;
    }
    .icon {
      width: 64px;
      height: 64px;
      margin: 0 auto 1.5rem;
      background: #1f1f1f;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .icon svg {
      width: 32px;
      height: 32px;
      color: #ef4444;
    }
    h1 {
      font-size: 1.5rem;
      font-weight: 600;
      margin-bottom: 0.5rem;
      color: #fafafa;
    }
    p {
      font-size: 0.875rem;
      color: #737373;
      margin-bottom: 1.5rem;
    }
    .hint {
      font-size: 0.75rem;
      color: #525252;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </div>
    <h1>Login Failed</h1>
    <p>${escaped}</p>
    <p class="hint">Please try again.</p>
  </div>
</body>
</html>`;
}
