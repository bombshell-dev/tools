import { readlink, symlink } from 'node:fs/promises';
import { findPackageJSON } from 'node:module';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import { platform } from 'node:process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { NodeHfs } from '@humanfs/node';
import { parse } from 'ultramatter';
import type { CommandContext } from '../context.ts';

const hfs = new NodeHfs();

const SENTINEL_START = '<!-- bsh:skills -->';
const SENTINEL_END = '<!-- /bsh:skills -->';
const GITIGNORE_START = '# bsh:skills';
const GITIGNORE_END = '# /bsh:skills';

export async function sync(_ctx: CommandContext): Promise<void> {
	const parentPkg = findParentPackage();
	if (!parentPkg) {
		console.info('Skipping sync — no parent project found (running inside @bomb.sh/tools?)');
		return;
	}

	const root = pathToFileURL(`${dirname(parentPkg)}/`);
	const source = new URL('../../skills/', import.meta.url);

	if (!(await hfs.isDirectory(source))) {
		console.error('Could not locate bundled skills directory.');
		return;
	}

	const skills = await copySkills({ source, dest: new URL('skills/', root) });
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

	const keep = new Set<string>();
	for await (const entry of hfs.list(source)) {
		if (entry.isDirectory && !entry.name.startsWith('_')) {
			keep.add(entry.name);
		}
	}

	await hfs.createDirectory(dest);
	await pruneStaleLinks({ dest, source, keep });

	const destDirPath = fileURLToPath(dest);
	const linkType = platform === 'win32' ? 'junction' : 'dir';

	for (const name of keep) {
		const srcDir = new URL(`${name}/`, source);
		const destDir = new URL(`${name}/`, dest);

		await hfs.deleteAll(destDir);

		const target = relative(destDirPath, fileURLToPath(srcDir));
		await symlink(target, fileURLToPath(destDir), linkType);

		const content = await hfs.text(new URL('SKILL.md', srcDir));
		if (content) {
			const frontmatter = parseFrontmatter(content);
			if (frontmatter) {
				skills.push(frontmatter);
			}
		}
	}

	return skills;
}

async function pruneStaleLinks(options: {
	dest: URL;
	source: URL;
	keep: Set<string>;
}): Promise<void> {
	const { dest, source, keep } = options;
	if (!(await hfs.isDirectory(dest))) return;

	const destPath = fileURLToPath(dest);
	const sourcePath = fileURLToPath(source);

	for await (const entry of hfs.list(dest)) {
		if (!entry.isSymlink) continue;
		if (keep.has(entry.name)) continue;

		const linkPath = fileURLToPath(new URL(entry.name, dest));
		try {
			const target = await readlink(linkPath);
			const absTarget = isAbsolute(target) ? target : resolve(destPath, target);
			if (absTarget.startsWith(sourcePath)) {
				await hfs.deleteAll(linkPath);
			}
		} catch {
			// ignore unreadable links
		}
	}
}

async function updateGitignore(options: { root: URL; skills: SkillInfo[] }): Promise<void> {
	const { root, skills } = options;
	const gitignorePath = new URL('.gitignore', root);
	let content = (await hfs.text(gitignorePath)) ?? '';

	const lines = skills.map((s) => `skills/${s.name}/`);
	const section = [GITIGNORE_START, ...lines, GITIGNORE_END].join('\n');

	const startIdx = content.indexOf(GITIGNORE_START);
	const endIdx = content.indexOf(GITIGNORE_END);

	if (startIdx !== -1 && endIdx !== -1) {
		content = content.slice(0, startIdx) + section + content.slice(endIdx + GITIGNORE_END.length);
	} else if (skills.length > 0) {
		const suffix = content.endsWith('\n') || content === '' ? '' : '\n';
		content = content + suffix + '\n' + section + '\n';
	}

	await hfs.write(gitignorePath, content);
}

async function updateAgentsMd(options: { root: URL; skills: SkillInfo[] }): Promise<void> {
	const { root, skills } = options;
	const agentsPath = new URL('AGENTS.md', root);
	let content = (await hfs.text(agentsPath)) ?? '';

	const lines = skills.map((s) => {
		const desc = s.description.split('.')[0]?.trim();
		return `- **${s.name}** — [skills/${s.name}/SKILL.md](skills/${s.name}/SKILL.md)${desc ? ` - ${desc}` : ''}`;
	});

	const section = [
		SENTINEL_START,
		'## @bomb.sh/tools Skills',
		'',
		'When working on these tasks, read the linked skill file for guidance:',
		'',
		...lines,
		SENTINEL_END,
	].join('\n');

	const startIdx = content.indexOf(SENTINEL_START);
	const endIdx = content.indexOf(SENTINEL_END);

	if (startIdx !== -1 && endIdx !== -1) {
		content = content.slice(0, startIdx) + section + content.slice(endIdx + SENTINEL_END.length);
	} else {
		const suffix = content.endsWith('\n') || content === '' ? '' : '\n';
		content = content + suffix + '\n' + section + '\n';
	}

	await hfs.write(agentsPath, content);
}

function parseFrontmatter(content: string): SkillInfo | undefined {
	const { frontmatter } = parse(content);
	if (!frontmatter) return undefined;
	const name = frontmatter.name as string | undefined;
	const description =
		(frontmatter.description as string | undefined)?.trim().replaceAll(/\s+/g, ' ') ?? '';
	if (!name) return undefined;
	return { name, description };
}

function findParentPackage(): string | null {
	const ownPkg = findPackageJSON(import.meta.url);
	if (!ownPkg) return null;

	let cursor = dirname(dirname(ownPkg));
	while (cursor !== dirname(cursor)) {
		const candidate = findPackageJSON(pathToFileURL(`${cursor}/`));
		if (!candidate) return null;
		if (candidate !== ownPkg) return candidate;
		cursor = dirname(dirname(candidate));
	}
	return null;
}
