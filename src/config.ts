/**
 * Generic configuration manager for CLI applications.
 *
 * Features:
 * - Dev/prod environment separation
 * - Type-safe config access
 * - Sync and async APIs
 * - Secure file permissions (0600)
 */

import {
	existsSync,
	mkdirSync,
	readFileSync,
	unlinkSync,
	writeFileSync,
} from "node:fs";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

const DEFAULT_PROD_FILENAME = "config.json";
const DEFAULT_DEV_FILENAME = "config.dev.json";

export interface ConfigManagerOptions {
	/** Filename for production config (default: "config.json") */
	prodFilename?: string;
	/** Filename for dev config (default: "config.dev.json") */
	devFilename?: string;
}

/**
 * Generic configuration manager with type-safe access.
 *
 * @typeParam T - The shape of the configuration object
 */
export class ConfigManager<T extends Record<string, unknown>> {
	readonly configDir: string;
	readonly configPath: string;

	constructor(
		configDir: string,
		isDev = false,
		options: ConfigManagerOptions = {},
	) {
		this.configDir = configDir;

		const {
			prodFilename = DEFAULT_PROD_FILENAME,
			devFilename = DEFAULT_DEV_FILENAME,
		} = options;

		const filename = isDev ? devFilename : prodFilename;
		this.configPath = join(configDir, filename);
	}

	/**
	 * Read configuration synchronously.
	 * Returns empty object if file doesn't exist or is invalid.
	 */
	read(): T {
		try {
			const content = readFileSync(this.configPath, "utf-8");
			return JSON.parse(content) as T;
		} catch {
			return {} as T;
		}
	}

	/**
	 * Read configuration asynchronously.
	 * Returns empty object if file doesn't exist or is invalid.
	 */
	async readAsync(): Promise<T> {
		try {
			const content = await readFile(this.configPath, "utf-8");
			return JSON.parse(content) as T;
		} catch {
			return {} as T;
		}
	}

	/**
	 * Write configuration synchronously.
	 * Merges with existing config and creates directory if needed.
	 * Sets file permissions to 0600 for security.
	 */
	write(partial: Partial<T>): void {
		if (!existsSync(this.configDir)) {
			mkdirSync(this.configDir, { recursive: true });
		}
		const existing = this.read();
		const merged = { ...existing, ...partial };
		writeFileSync(this.configPath, `${JSON.stringify(merged, null, 2)}\n`, {
			mode: 0o600,
		});
	}

	/**
	 * Write configuration asynchronously.
	 * Merges with existing config and creates directory if needed.
	 * Sets file permissions to 0600 for security.
	 */
	async writeAsync(partial: Partial<T>): Promise<void> {
		const dir = dirname(this.configPath);
		await mkdir(dir, { recursive: true });
		const existing = await this.readAsync();
		const merged = { ...existing, ...partial };
		await writeFile(this.configPath, `${JSON.stringify(merged, null, 2)}\n`, {
			mode: 0o600,
		});
	}

	/**
	 * Delete the configuration file.
	 */
	delete(): void {
		try {
			unlinkSync(this.configPath);
		} catch {
			// File doesn't exist, ignore
		}
	}

	/**
	 * Delete the configuration file asynchronously.
	 */
	async deleteAsync(): Promise<void> {
		try {
			await unlink(this.configPath);
		} catch {
			// File doesn't exist, ignore
		}
	}

	/**
	 * Check if the configuration file exists.
	 */
	exists(): boolean {
		return existsSync(this.configPath);
	}

	/**
	 * Get a specific configuration value.
	 */
	get<K extends keyof T>(key: K): T[K] | undefined {
		const config = this.read();
		return config[key];
	}

	/**
	 * Set a specific configuration value.
	 */
	set<K extends keyof T>(key: K, value: T[K]): void {
		const partial = { [key]: value } as unknown as Partial<T>;
		this.write(partial);
	}
}
