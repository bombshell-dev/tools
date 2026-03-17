import { readFile, writeFile, mkdir } from "node:fs/promises";
import { cwd } from "node:process";
import { pathToFileURL } from "node:url";
import type { CommandContext } from "../context.ts";

const TEMPLATE_REPO = "bombshell-dev/template";
const TEMPLATE_REF = "main";

/** Files to sync from the template repo */
const SYNCED_FILES = [
	".github/workflows/format.yml",
	".github/workflows/preview.yml",
	".github/workflows/publish.yml",
	".gitignore",
	"tsconfig.json",
] as const;

/** Standard scripts that all bombshell repos should have */
const SYNCED_SCRIPTS: Record<string, string> = {
	dev: "bsh dev",
	build: "bsh build",
	format: "bsh format",
	lint: "bsh lint",
	test: "bsh test",
};

/** Standard devEngines config */
const SYNCED_ENGINES = {
	runtime: {
		name: "node",
		version: "22.14.0",
		onFail: "error",
	},
	packageManager: {
		name: "pnpm",
		version: "10.7.0",
		onFail: "error",
	},
};

export async function sync(_ctx: CommandContext) {
	const root = pathToFileURL(`${cwd()}/`);
	const results: SyncResult[] = [];

	results.push(...(await syncFiles(root)));
	results.push(...(await syncPackageJson(root)));

	printResults(results);
}

interface SyncResult {
	file: string;
	action: "updated" | "created" | "skipped";
	reason?: string;
}

/** Fetch a file from the template repo via GitHub API */
async function fetchTemplateFile(path: string): Promise<string> {
	const url = `https://raw.githubusercontent.com/${TEMPLATE_REPO}/${TEMPLATE_REF}/${path}`;
	const res = await fetch(url);
	if (!res.ok) {
		throw new Error(`Failed to fetch ${path}: ${res.status} ${res.statusText}`);
	}
	return res.text();
}

/** Sync files from the template repo */
async function syncFiles(root: URL): Promise<SyncResult[]> {
	const results: SyncResult[] = [];

	for (const file of SYNCED_FILES) {
		const dest = new URL(file, root);
		const destPath = new URL("./", dest);

		let remote: string;
		try {
			remote = await fetchTemplateFile(file);
		} catch {
			results.push({ file, action: "skipped", reason: "not found in template" });
			continue;
		}

		let local: string | undefined;
		try {
			local = await readFile(dest, { encoding: "utf8" });
		} catch {
			// file doesn't exist locally yet
		}

		if (local === remote) {
			results.push({ file, action: "skipped", reason: "already up to date" });
			continue;
		}

		await mkdir(destPath, { recursive: true });
		await writeFile(dest, remote, { encoding: "utf8" });
		results.push({ file, action: local === undefined ? "created" : "updated" });
	}

	return results;
}

/** Sync package.json scripts and devEngines */
async function syncPackageJson(root: URL): Promise<SyncResult[]> {
	const results: SyncResult[] = [];
	const pkgPath = new URL("package.json", root);

	let raw: string;
	try {
		raw = await readFile(pkgPath, { encoding: "utf8" });
	} catch {
		results.push({ file: "package.json", action: "skipped", reason: "not found" });
		return results;
	}

	const pkg = JSON.parse(raw);
	let changed = false;

	// Sync scripts
	if (!pkg.scripts) pkg.scripts = {};
	for (const [name, value] of Object.entries(SYNCED_SCRIPTS)) {
		if (pkg.scripts[name] !== value) {
			pkg.scripts[name] = value;
			changed = true;
		}
	}

	// Sync devEngines
	if (JSON.stringify(pkg.devEngines) !== JSON.stringify(SYNCED_ENGINES)) {
		pkg.devEngines = SYNCED_ENGINES;
		changed = true;
	}

	// Remove volta if devEngines is now set
	if (pkg.volta) {
		delete pkg.volta;
		changed = true;
	}

	// Ensure @bomb.sh/tools is a devDependency
	if (!pkg.devDependencies) pkg.devDependencies = {};
	if (!pkg.devDependencies["@bomb.sh/tools"]) {
		pkg.devDependencies["@bomb.sh/tools"] = "latest";
		changed = true;
	}

	if (!changed) {
		results.push({ file: "package.json", action: "skipped", reason: "already up to date" });
		return results;
	}

	await writeFile(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`, { encoding: "utf8" });
	results.push({ file: "package.json", action: "updated" });
	return results;
}

function printResults(results: SyncResult[]) {
	const pad = Math.max(...results.map((r) => r.file.length));
	for (const result of results) {
		const label = result.file.padEnd(pad);
		switch (result.action) {
			case "created":
				console.log(`  + ${label}  \x1b[32mcreated\x1b[0m`);
				break;
			case "updated":
				console.log(`  ~ ${label}  \x1b[33mupdated\x1b[0m`);
				break;
			case "skipped":
				console.log(`  · ${label}  \x1b[2m${result.reason}\x1b[0m`);
				break;
		}
	}
}
