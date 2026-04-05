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
			res.end(`<!DOCTYPE html>
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
      color: #c9a227;
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
</html>`);

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
