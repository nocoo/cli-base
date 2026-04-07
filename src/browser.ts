/**
 * Cross-platform browser opening utilities.
 */

type ExecCallback = (
	error: Error | null,
	stdout: string,
	stderr: string,
) => void;
type ExecFn = (cmd: string, callback: ExecCallback) => void;

/**
 * Get the platform-specific command to open a URL in the default browser.
 */
export function getBrowserCommand(): string {
	switch (process.platform) {
		case "darwin":
			return "open";
		case "win32":
			return "start";
		default:
			return "xdg-open";
	}
}

/**
 * Open a URL in the default browser.
 *
 * @param url - The URL to open
 * @param execFn - Optional exec function for testing (defaults to child_process.exec)
 */
export async function openBrowser(url: string, execFn?: ExecFn): Promise<void> {
	const exec = execFn ?? (await import("node:child_process")).exec;
	const cmd = getBrowserCommand();

	return new Promise((resolve, reject) => {
		// On Windows, 'start' command treats the first quoted argument as window title.
		// We must pass an empty title ("") before the URL.
		const fullCmd =
			process.platform === "win32" ? `${cmd} "" "${url}"` : `${cmd} "${url}"`;
		exec(fullCmd, (error) => {
			if (error) reject(error);
			else resolve();
		});
	});
}
