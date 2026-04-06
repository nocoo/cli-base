/**
 * Standard update command for CLI applications.
 *
 * Provides a reusable update command that:
 * - Checks current vs latest version
 * - Detects package manager
 * - Executes update command
 */

import { execSync } from "node:child_process";
import { defineCommand } from "citty";
import { consola } from "./log.js";
import {
	detectPackageManager,
	getLatestVersion,
	getUpdateCommand,
} from "./update.js";

export interface UpdateCommandOptions {
	/** Package name on npm (e.g., "@nocoo/pika") */
	packageName: string;
	/** Current version of the CLI */
	currentVersion: string;
	/** CLI display name for messages (e.g., "pika") */
	cliName?: string;
}

/**
 * Create a standard update command for a CLI application.
 *
 * @example
 * ```ts
 * import { createUpdateCommand } from "@nocoo/cli-base";
 * import { PIKA_VERSION } from "@pika/core";
 *
 * export default createUpdateCommand({
 *   packageName: "@nocoo/pika",
 *   currentVersion: PIKA_VERSION,
 *   cliName: "pika",
 * });
 * ```
 */
export function createUpdateCommand(options: UpdateCommandOptions) {
	const { packageName, currentVersion, cliName } = options;
	const displayName = cliName ?? packageName;

	return defineCommand({
		meta: {
			name: "update",
			description: `Update ${displayName} CLI to the latest version`,
		},
		args: {
			check: {
				type: "boolean",
				description: "Only check for updates, don't install",
				default: false,
			},
		},
		async run({ args }) {
			consola.info(`Current version: ${currentVersion}`);

			// Check latest version
			const latest = await getLatestVersion(packageName);
			if (!latest) {
				consola.warn("Could not fetch latest version from npm registry");
				return;
			}

			consola.info(`Latest version: ${latest}`);

			if (currentVersion === latest) {
				consola.success("You are already on the latest version!");
				return;
			}

			if (args.check) {
				consola.info(`Update available: ${currentVersion} → ${latest}`);
				consola.info(`Run \`${displayName} update\` to install the update`);
				return;
			}

			// Detect package manager
			const pm = detectPackageManager(packageName);
			if (!pm) {
				consola.warn(
					"Could not detect package manager. Please update manually:",
				);
				consola.info(`  npm update -g ${packageName}`);
				consola.info(`  # or: bun update -g ${packageName}`);
				consola.info(`  # or: pnpm update -g ${packageName}`);
				return;
			}

			consola.info(`Detected package manager: ${pm}`);
			consola.info(`Updating ${currentVersion} → ${latest}...`);

			const cmd = getUpdateCommand(pm, packageName);
			consola.info(`Running: ${cmd}`);

			try {
				execSync(cmd, { stdio: "inherit" });
				consola.success("Update complete!");
			} catch (err) {
				consola.error(`Update failed. Try running manually: ${cmd}`);
				throw err;
			}
		},
	});
}
