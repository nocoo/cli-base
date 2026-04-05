/**
 * Version utilities for CLI applications.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Read version from a package.json file.
 *
 * @param dir - Directory containing package.json
 * @param filename - Optional custom filename (default: "package.json")
 * @returns The version string, or "0.0.0" if not found
 */
export function readVersion(dir: string, filename = "package.json"): string {
	try {
		const content = readFileSync(join(dir, filename), "utf-8");
		const pkg = JSON.parse(content) as { version?: string };
		return pkg.version ?? "0.0.0";
	} catch {
		return "0.0.0";
	}
}

/**
 * Compare two semantic versions.
 *
 * @param a - First version
 * @param b - Second version
 * @returns Positive if a > b, negative if a < b, 0 if equal
 */
export function compareVersions(a: string, b: string): number {
	const partsA = a.split(".").map(Number);
	const partsB = b.split(".").map(Number);

	const maxLength = Math.max(partsA.length, partsB.length);

	for (let i = 0; i < maxLength; i++) {
		const numA = partsA[i] ?? 0;
		const numB = partsB[i] ?? 0;

		if (numA > numB) return 1;
		if (numA < numB) return -1;
	}

	return 0;
}

/**
 * Check if a latest version is newer than the current version.
 *
 * @param current - Current version
 * @param latest - Latest version to compare
 * @returns true if latest is newer than current
 */
export function isNewerVersion(current: string, latest: string): boolean {
	return compareVersions(latest, current) > 0;
}
