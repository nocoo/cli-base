/**
 * Update command utilities for CLI applications.
 *
 * Provides helpers for:
 * - Detecting which package manager installed the CLI
 * - Fetching latest version from npm
 * - Generating update commands
 */

export type PackageManager = "npm" | "bun" | "pnpm" | "yarn";

type ExecSyncFn = (cmd: string, options?: { encoding: string }) => string;
type FetchFn = typeof fetch;

/**
 * Detect which package manager installed a global CLI package.
 *
 * @param packageName - The npm package name to look for
 * @param execSync - Optional exec function for testing
 * @returns The detected package manager, or null if not found
 */
export function detectPackageManager(
	packageName: string,
	execSync?: ExecSyncFn,
): PackageManager | null {
	/* c8 ignore next 4 -- default exec uses real child_process */
	const exec =
		execSync ??
		((cmd: string) => {
			const { execSync: nodeExec } = require("node:child_process");
			return nodeExec(cmd, { encoding: "utf-8" }) as string;
		});

	// Check bun first (most likely for @nocoo packages)
	try {
		const bunGlobal = exec("bun pm ls -g 2>/dev/null", { encoding: "utf-8" });
		if (bunGlobal.includes(packageName)) return "bun";
	} catch {
		// Not bun
	}

	// Check pnpm
	try {
		const pnpmGlobal = exec("pnpm list -g --depth=0 2>/dev/null", {
			encoding: "utf-8",
		});
		if (pnpmGlobal.includes(packageName)) return "pnpm";
	} catch {
		// Not pnpm
	}

	// Check yarn
	try {
		const yarnGlobal = exec("yarn global list 2>/dev/null", {
			encoding: "utf-8",
		});
		if (yarnGlobal.includes(packageName)) return "yarn";
	} catch {
		// Not yarn
	}

	// Check npm
	try {
		const npmGlobal = exec("npm list -g --depth=0 2>/dev/null", {
			encoding: "utf-8",
		});
		if (npmGlobal.includes(packageName)) return "npm";
	} catch {
		// Not npm
	}

	return null;
}

/**
 * Fetch the latest version of a package from npm registry.
 *
 * @param packageName - The npm package name
 * @param fetchFn - Optional fetch function for testing
 * @returns The latest version string, or null if fetch failed
 */
export async function getLatestVersion(
	packageName: string,
	fetchFn?: FetchFn,
): Promise<string | null> {
	const doFetch = fetchFn ?? fetch;

	try {
		const response = await doFetch(
			`https://registry.npmjs.org/${packageName}/latest`,
		);
		if (!response.ok) return null;
		const data = (await response.json()) as { version: string };
		return data.version;
	} catch {
		return null;
	}
}

/**
 * Get the update command for a specific package manager.
 *
 * @param pm - The package manager
 * @param packageName - The npm package name
 * @returns The shell command to run
 */
export function getUpdateCommand(
	pm: PackageManager,
	packageName: string,
): string {
	const commands: Record<PackageManager, string> = {
		npm: `npm update -g ${packageName}`,
		bun: `bun update -g ${packageName}`,
		pnpm: `pnpm update -g ${packageName}`,
		yarn: `yarn global upgrade ${packageName}`,
	};
	return commands[pm];
}
