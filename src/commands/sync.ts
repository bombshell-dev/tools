import { copyFile, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { cwd } from "node:process";
import { pathToFileURL } from "node:url";
import { parse } from "ultramatter";
import type { CommandContext } from "../context.ts";

const SENTINEL_START = "<!-- bsh:skills -->";
const SENTINEL_END = "<!-- /bsh:skills -->";

export async function sync(_ctx: CommandContext): Promise<void> {
	const root = pathToFileURL(`${cwd()}/`);

	if (await isSelf(root)) {
		console.info("Skipping sync — running inside @bomb.sh/tools");
		return;
	}

	const source = new URL("node_modules/@bomb.sh/tools/skills/", root);
	if (!(await exists(source))) {
		console.error("@bomb.sh/tools is not installed. Run `pnpm add -D @bomb.sh/tools` first.");
		return;
	}

	const skills = await copySkills({ source, dest: new URL("skills/", root) });
	await updateGitignore({ root, skills });
	await updateAgentsMd({ root, skills });

	console.info(`Synced ${skills.length} skills to skills/`);
}

interface SkillInfo {
	name: string;
	description: string;
}

async function copySkills(options: { source: URL; dest: URL }): Promise<SkillInfo[]> {
	const { source, dest } = options;
	const skills: SkillInfo[] = [];
	const entries = await readdir(source, { withFileTypes: true });

	for (const entry of entries) {
		if (!entry.isDirectory()) continue;
		if (entry.name.startsWith("_")) continue;

		const srcDir = new URL(`${entry.name}/`, source);
		const destDir = new URL(`${entry.name}/`, dest);

		await rm(destDir, { recursive: true, force: true });
		await copyDir({ source: srcDir, dest: destDir });

		const skillMd = new URL("SKILL.md", destDir);
		if (await exists(skillMd)) {
			const content = await readFile(skillMd, "utf8");
			const frontmatter = parseFrontmatter(content);
			if (frontmatter) {
				skills.push(frontmatter);
			}
		}
	}

	return skills;
}

async function copyDir(options: { source: URL; dest: URL }): Promise<void> {
	const { source, dest } = options;
	await mkdir(dest, { recursive: true });
	const entries = await readdir(source, { withFileTypes: true });

	for (const entry of entries) {
		const srcPath = new URL(entry.name, source);
		const destPath = new URL(entry.name, dest);

		if (entry.isDirectory()) {
			if (entry.name.startsWith("_")) continue;
			await copyDir({ source: new URL(`${entry.name}/`, source), dest: new URL(`${entry.name}/`, dest) });
		} else {
			await copyFile(srcPath, destPath);
		}
	}
}

async function updateGitignore(options: { root: URL; skills: SkillInfo[] }): Promise<void> {
	const { root, skills } = options;
	const gitignorePath = new URL(".gitignore", root);
	let content = "";
	if (await exists(gitignorePath)) {
		content = await readFile(gitignorePath, "utf8");
	}

	const missing: string[] = [];
	for (const skill of skills) {
		const entry = `skills/${skill.name}/`;
		if (!content.includes(entry)) {
			missing.push(entry);
		}
	}

	if (missing.length === 0) return;

	const suffix = content.endsWith("\n") || content === "" ? "" : "\n";
	const section = `${suffix}\n# @bomb.sh/tools skills (synced)\n${missing.join("\n")}\n`;
	await writeFile(gitignorePath, content + section, "utf8");
}

async function updateAgentsMd(options: { root: URL; skills: SkillInfo[] }): Promise<void> {
	const { root, skills } = options;
	const agentsPath = new URL("AGENTS.md", root);
	let content = "";
	if (await exists(agentsPath)) {
		content = await readFile(agentsPath, "utf8");
	}

	const lines = skills.map((s) => {
		const desc = s.description.split(".")[0].trim();
		return `- **${s.name}** — [skills/${s.name}/SKILL.md](skills/${s.name}/SKILL.md) — ${desc}`;
	});

	const section = [
		SENTINEL_START,
		"## @bomb.sh/tools Skills",
		"",
		"When working on these tasks, read the linked skill file for guidance:",
		"",
		...lines,
		SENTINEL_END,
	].join("\n");

	const startIdx = content.indexOf(SENTINEL_START);
	const endIdx = content.indexOf(SENTINEL_END);

	if (startIdx !== -1 && endIdx !== -1) {
		content = content.slice(0, startIdx) + section + content.slice(endIdx + SENTINEL_END.length);
	} else {
		const suffix = content.endsWith("\n") || content === "" ? "" : "\n";
		content = content + suffix + "\n" + section + "\n";
	}

	await writeFile(agentsPath, content, "utf8");
}

function parseFrontmatter(content: string): SkillInfo | undefined {
	const { frontmatter } = parse(content);
	if (!frontmatter) return undefined;
	const name = frontmatter.name as string | undefined;
	const description = (frontmatter.description as string | undefined)?.trim().replaceAll(/\s+/g, " ") ?? "";
	if (!name) return undefined;
	return { name, description };
}

async function isSelf(root: URL): Promise<boolean> {
	const pkgPath = new URL("package.json", root);
	if (!(await exists(pkgPath))) return false;
	const content = await readFile(pkgPath, "utf8");
	const pkg = JSON.parse(content) as { name?: string };
	return pkg.name === "@bomb.sh/tools";
}

async function exists(url: URL): Promise<boolean> {
	try {
		await readdir(url);
		return true;
	} catch {
		try {
			await readFile(url);
			return true;
		} catch {
			return false;
		}
	}
}
