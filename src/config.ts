/**
 * Generic configuration manager for CLI applications.
 *
 * Features:
 * - Dev/prod environment separation
 * - Type-safe config access
 * - Sync and async APIs
 * - Secure file permissions (0600)
 * - Optional shared device ID management
 */

import { randomUUID } from "node:crypto";
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
const DEFAULT_DEVICE_FILENAME = "device.json";

export interface ConfigManagerOptions {
	/** Filename for production config (default: "config.json") */
	prodFilename?: string;
	/** Filename for dev config (default: "config.dev.json") */
	devFilename?: string;
	/**
	 * Filename for shared device ID storage (default: "device.json").
	 * The device ID file is shared across dev/prod environments.
	 */
	deviceFilename?: string;
}

/**
 * Generic configuration manager with type-safe access.
 *
 * @typeParam T - The shape of the configuration object
 */
export class ConfigManager<T extends Record<string, unknown>> {
	readonly configDir: string;
	readonly configPath: string;
	private readonly deviceFilename: string;

	constructor(
		configDir: string,
		isDev = false,
		options: ConfigManagerOptions = {},
	) {
		this.configDir = configDir;

		const {
			prodFilename = DEFAULT_PROD_FILENAME,
			devFilename = DEFAULT_DEV_FILENAME,
			deviceFilename = DEFAULT_DEVICE_FILENAME,
		} = options;

		const filename = isDev ? devFilename : prodFilename;
		this.configPath = join(configDir, filename);
		this.deviceFilename = deviceFilename;
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

	/**
	 * Ensure a stable device ID exists in the shared device file.
	 * The device file is NOT per-env — dev and prod share the same device ID.
	 *
	 * If the per-env config has a legacy `deviceId` field, it is migrated
	 * to the shared device file and removed from the config.
	 *
	 * @returns The device ID (existing or newly generated)
	 */
	async ensureDeviceId(): Promise<string> {
		const devicePath = join(this.configDir, this.deviceFilename);

		// 1. Try reading existing device file
		try {
			const raw = await readFile(devicePath, "utf-8");
			const data = JSON.parse(raw) as { deviceId?: string };
			if (data.deviceId) {
				return data.deviceId;
			}
		} catch {
			// File doesn't exist or is corrupted — fall through
		}

		// 2. Migrate from legacy per-env config if present
		const config = this.read();
		const legacyDeviceId = (config as Record<string, unknown>).deviceId as
			| string
			| undefined;
		const deviceId = legacyDeviceId ?? randomUUID();

		// 3. Write shared device file
		await mkdir(this.configDir, { recursive: true });
		await writeFile(devicePath, `${JSON.stringify({ deviceId }, null, 2)}\n`, {
			mode: 0o600,
		});

		// 4. Remove legacy deviceId from per-env config (if it was there)
		if (legacyDeviceId) {
			const { deviceId: _, ...rest } = config as Record<string, unknown>;
			// Write directly without merge to remove the deviceId key
			await writeFile(this.configPath, `${JSON.stringify(rest, null, 2)}\n`, {
				mode: 0o600,
			});
		}

		return deviceId;
	}

	/**
	 * Get device ID synchronously.
	 * Returns undefined if device file doesn't exist.
	 * Use ensureDeviceId() for guaranteed device ID.
	 */
	getDeviceId(): string | undefined {
		const devicePath = join(this.configDir, this.deviceFilename);
		try {
			const raw = readFileSync(devicePath, "utf-8");
			const data = JSON.parse(raw) as { deviceId?: string };
			return data.deviceId;
		} catch {
			return undefined;
		}
	}
}
