#!/usr/bin/env bun
/**
 * Release script for @nocoo/cli-base
 *
 * Usage:
 *   bun run release          # patch (0.1.1 -> 0.1.2)
 *   bun run release minor    # minor (0.1.1 -> 0.2.0)
 *   bun run release major    # major (0.1.1 -> 1.0.0)
 *   bun run release 1.0.0    # explicit version
 *   bun run release --dry-run
 */

import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = import.meta.dir;
const PKG_PATH = join(ROOT, "..", "package.json");
const CHANGELOG_PATH = join(ROOT, "..", "CHANGELOG.md");

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function run(cmd: string, opts?: { silent?: boolean }): string {
	if (!opts?.silent) console.log(`$ ${cmd}`);
	return execSync(cmd, { encoding: "utf-8", cwd: join(ROOT, "..") }).trim();
}

function readJson<T>(path: string): T {
	return JSON.parse(readFileSync(path, "utf-8")) as T;
}

function writeJson(path: string, data: unknown): void {
	writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`);
}

function bumpVersion(
	current: string,
	type: "major" | "minor" | "patch" | string,
): string {
	const [major, minor, patch] = current.split(".").map(Number);

	switch (type) {
		case "major":
			return `${major + 1}.0.0`;
		case "minor":
			return `${major}.${minor + 1}.0`;
		case "patch":
			return `${major}.${minor}.${patch + 1}`;
		default:
			// Explicit version
			if (/^\d+\.\d+\.\d+$/.test(type)) return type;
			throw new Error(`Invalid version: ${type}`);
	}
}

function getToday(): string {
	const d = new Date();
	const pad = (n: number) => String(n).padStart(2, "0");
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function getCommitsSinceTag(tag: string): string[] {
	try {
		const log = run(`git log ${tag}..HEAD --oneline`, { silent: true });
		return log ? log.split("\n") : [];
	} catch {
		// No previous tag
		return run("git log --oneline", { silent: true }).split("\n");
	}
}

function generateChangelog(commits: string[]): string {
	const features: string[] = [];
	const fixes: string[] = [];
	const chores: string[] = [];

	for (const line of commits) {
		const msg = line.replace(/^[a-f0-9]+ /, "");
		if (msg.startsWith("feat")) {
			features.push(msg.replace(/^feat(\([^)]+\))?:\s*/, ""));
		} else if (msg.startsWith("fix")) {
			fixes.push(msg.replace(/^fix(\([^)]+\))?:\s*/, ""));
		} else if (!msg.startsWith("chore") && !msg.startsWith("docs")) {
			chores.push(msg);
		}
	}

	const sections: string[] = [];
	if (features.length > 0) {
		sections.push(
			"### Features\n\n" + features.map((f) => `- ${f}`).join("\n"),
		);
	}
	if (fixes.length > 0) {
		sections.push("### Fixes\n\n" + fixes.map((f) => `- ${f}`).join("\n"));
	}

	return sections.join("\n\n") || "### Changes\n\n- Minor updates";
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
	const args = process.argv.slice(2);
	const dryRun = args.includes("--dry-run");
	const versionArg = args.find((a) => !a.startsWith("--")) ?? "patch";

	// 1. Read current version
	const pkg = readJson<{ version: string }>(PKG_PATH);
	const currentVersion = pkg.version;
	const newVersion = bumpVersion(currentVersion, versionArg);

	console.log(`\n📦 @nocoo/cli-base release`);
	console.log(`   ${currentVersion} → ${newVersion}`);
	console.log(`   ${dryRun ? "(dry run)" : ""}\n`);

	// 2. Check working directory is clean
	const status = run("git status --porcelain", { silent: true });
	if (status && !dryRun) {
		console.error("❌ Working directory not clean. Commit or stash changes.");
		process.exit(1);
	}

	// 3. Run tests
	console.log("🧪 Running tests...");
	if (!dryRun) {
		run("bun run test:coverage");
	}

	// 4. Run lint
	console.log("📝 Running lint...");
	if (!dryRun) {
		run("bun run lint");
	}

	// 5. Update package.json
	console.log("📄 Updating package.json...");
	if (!dryRun) {
		const fullPkg = readJson<Record<string, unknown>>(PKG_PATH);
		fullPkg.version = newVersion;
		writeJson(PKG_PATH, fullPkg);
	}

	// 6. Update CHANGELOG.md
	console.log("📝 Updating CHANGELOG.md...");
	const commits = getCommitsSinceTag(`v${currentVersion}`);
	const changelogEntry = generateChangelog(commits);
	const today = getToday();

	if (!dryRun) {
		const changelog = readFileSync(CHANGELOG_PATH, "utf-8");
		const newEntry = `## [${newVersion}] - ${today}\n\n${changelogEntry}\n\n`;
		const updated = changelog.replace(
			/(# Changelog\n\nAll notable changes.*?\n\n)/,
			`$1${newEntry}`,
		);
		writeFileSync(CHANGELOG_PATH, updated);
	} else {
		console.log(`   Would add:\n${changelogEntry}`);
	}

	// 7. Commit
	console.log("💾 Committing...");
	if (!dryRun) {
		run("git add package.json CHANGELOG.md");
		run(`git commit -m "chore: release v${newVersion}" --no-verify`);
	}

	// 8. Tag
	console.log(`🏷️  Tagging v${newVersion}...`);
	if (!dryRun) {
		run(`git tag v${newVersion}`);
	}

	// 9. Push
	console.log("🚀 Pushing...");
	if (!dryRun) {
		run("git push --no-verify");
		run(`git push origin v${newVersion} --no-verify`);
	}

	// 10. Publish to npm
	console.log("📤 Publishing to npm...");
	if (!dryRun) {
		run("npm publish --access public");
	}

	// 11. Create GitHub release
	console.log("🎉 Creating GitHub release...");
	if (!dryRun) {
		const releaseNotes = changelogEntry.replace(/### /g, "## ");
		run(
			`gh release create v${newVersion} --title "v${newVersion}" --notes "${releaseNotes.replace(/"/g, '\\"')}"`,
		);
	}

	console.log(`\n✅ Released @nocoo/cli-base@${newVersion}`);
	console.log(`   npm: https://www.npmjs.com/package/@nocoo/cli-base`);
	console.log(
		`   GitHub: https://github.com/nocoo/cli-base/releases/tag/v${newVersion}`,
	);
}

main().catch((err) => {
	console.error("❌ Release failed:", err.message);
	process.exit(1);
});
