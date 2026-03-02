import { readFile, writeFile, access } from "node:fs/promises";
import { dirname, join } from "node:path";
import { confirm } from "@clack/prompts";
import type { CommandContext } from "../../context.ts";
import { getPackageJSONPath } from "../../utils.ts";
import { devEngines } from "./_env.ts";

interface ConfigChange {
	location: string;
	current: string;
	new: string;
}

export async function sync(ctx: CommandContext) {
	try {
		const changes: ConfigChange[] = [];

		// Get the package.json file path and directory
		const pkgPath = await getPackageJSONPath();
		const projectDir = dirname(pkgPath);

		// Read the raw file content to preserve formatting
		const content = await readFile(pkgPath, { encoding: "utf8" });
		const pkg = JSON.parse(content);

		// Check devEngines
		const currentDevEngines = pkg.devEngines;
		const devEnginesMatch =
			currentDevEngines &&
			JSON.stringify(currentDevEngines) === JSON.stringify(devEngines);

		if (!devEnginesMatch) {
			changes.push({
				location: "package.json → devEngines",
				current: currentDevEngines
					? JSON.stringify(currentDevEngines, null, 2)
					: "(not set)",
				new: JSON.stringify(devEngines, null, 2),
			});
		}

		// Check packageManager field
		const expectedPackageManager = `${devEngines.packageManager.name}@${devEngines.packageManager.version}`;
		const currentPackageManager = pkg.packageManager;

		if (currentPackageManager !== expectedPackageManager) {
			changes.push({
				location: "package.json → packageManager",
				current: currentPackageManager || "(not set)",
				new: expectedPackageManager,
			});
		}

		// Check volta.node field
		const currentVolta = pkg.volta?.node;
		const expectedVolta = devEngines.runtime.version;

		if (currentVolta !== expectedVolta) {
			changes.push({
				location: "package.json → volta.node",
				current: currentVolta || "(not set)",
				new: expectedVolta,
			});
		}

		// Check .npmrc for node-version
		const npmrcPath = join(projectDir, ".npmrc");
		let npmrcContent: string | null = null;
		let currentNpmrcNodeVersion: string | null = null;

		try {
			await access(npmrcPath);
			npmrcContent = await readFile(npmrcPath, { encoding: "utf8" });

			// Parse node-version from .npmrc
			const nodeVersionMatch = npmrcContent.match(
				/^node-version\s*=\s*(.+)$/m,
			);
			if (nodeVersionMatch?.[1]) {
				currentNpmrcNodeVersion = nodeVersionMatch[1].trim();
			}

			if (currentNpmrcNodeVersion !== devEngines.runtime.version) {
				changes.push({
					location: ".npmrc → node-version",
					current: currentNpmrcNodeVersion || "(not set)",
					new: devEngines.runtime.version,
				});
			}
		} catch {
			// .npmrc doesn't exist, we could optionally create it
			// For now, skip if it doesn't exist
		}

		// If everything is in sync, exit early
		if (changes.length === 0) {
			console.log("✓ All configuration is already in sync");
			return;
		}

		// Display all changes
		console.log("\nThe following changes will be made:\n");
		for (const change of changes) {
			console.log(`📝 ${change.location}`);
			console.log(`   Current: ${change.current.replace(/\n/g, "\n            ")}`);
			console.log(`   New:     ${change.new.replace(/\n/g, "\n            ")}`);
			console.log();
		}

		// Prompt user for confirmation
		const shouldUpdate = await confirm({
			message: `Update ${changes.length} configuration location${changes.length > 1 ? "s" : ""}?`,
			initialValue: true,
		});

		if (!shouldUpdate) {
			console.log("Sync cancelled");
			return;
		}

		// Apply all changes
		let updatedCount = 0;

		// Update package.json fields
		let pkgModified = false;

		if (!devEnginesMatch) {
			pkg.devEngines = devEngines;
			pkgModified = true;
			updatedCount++;
		}

		if (currentPackageManager !== expectedPackageManager) {
			pkg.packageManager = expectedPackageManager;
			pkgModified = true;
			updatedCount++;
		}

		if (currentVolta !== expectedVolta) {
			if (!pkg.volta) {
				pkg.volta = {};
			}
			pkg.volta.node = expectedVolta;
			pkgModified = true;
			updatedCount++;
		}

		if (pkgModified) {
			await writeFile(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`, {
				encoding: "utf8",
			});
		}

		// Update .npmrc if needed
		if (npmrcContent !== null && currentNpmrcNodeVersion !== devEngines.runtime.version) {
			let newNpmrcContent = npmrcContent;

			if (currentNpmrcNodeVersion) {
				// Replace existing node-version
				newNpmrcContent = newNpmrcContent.replace(
					/^node-version\s*=\s*.+$/m,
					`node-version=${devEngines.runtime.version}`,
				);
			} else {
				// Add node-version
				newNpmrcContent = newNpmrcContent.trim();
				newNpmrcContent += `\nnode-version=${devEngines.runtime.version}\n`;
			}

			await writeFile(npmrcPath, newNpmrcContent, { encoding: "utf8" });
			updatedCount++;
		}

		console.log(`✓ Successfully updated ${updatedCount} configuration location${updatedCount > 1 ? "s" : ""}`);
	} catch (error) {
		if (error instanceof Error) {
			console.error(`Error: ${error.message}`);
		} else {
			console.error("An unexpected error occurred");
		}
		process.exit(1);
	}
}
