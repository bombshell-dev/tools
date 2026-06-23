import { readlink, rm, symlink } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import { cwd, platform } from 'node:process';
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
	const project = await findProjectRoot(cwd());
	if (project.kind === 'self') {
		console.info('Skipping sync — running inside @bomb.sh/tools.');
		return;
	}
	if (project.kind === 'not-found') {
		console.info(`Skipping sync — no package.json found in ${cwd()} or any parent directory.`);
		return;
	}

	const root = project.root;
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

export async function copySkills(options: { source: URL; dest: URL }): Promise<SkillInfo[]> {
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

		// Use a path without a trailing slash. macOS rejects a trailing-slash link
		// path with ENOENT, and `rm` on a trailing-slash directory symlink follows
		// the link and deletes the source rather than unlinking the symlink itself.
		const linkPath = resolve(destDirPath, name);
		await rm(linkPath, { recursive: true, force: true });

		const target = relative(destDirPath, fileURLToPath(srcDir));
		await symlink(target, linkPath, linkType);

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

type ProjectLookup = { kind: 'found'; root: URL } | { kind: 'self' } | { kind: 'not-found' };

/**
 * Locate the project to sync into by walking up from `start` to the nearest
 * `package.json`.
 *
 * This is based on the working directory the user runs `bsh sync` from — not the
 * install location of `@bomb.sh/tools`, which under pnpm resolves to an unrelated
 * path inside the virtual store. Returns `self` when the nearest package is
 * `@bomb.sh/tools` so the command is a no-op when run inside this repo.
 */
export async function findProjectRoot(start: string): Promise<ProjectLookup> {
	let dir = start;
	while (true) {
		const pkgUrl = new URL('package.json', pathToFileURL(`${dir}/`));
		if (await hfs.isFile(pkgUrl)) {
			const pkg = (await hfs.json(pkgUrl)) as { name?: string } | undefined;
			if (pkg?.name === '@bomb.sh/tools') return { kind: 'self' };
			return { kind: 'found', root: new URL('./', pkgUrl) };
		}
		const parent = dirname(dir);
		if (parent === dir) return { kind: 'not-found' };
		dir = parent;
	}
}
