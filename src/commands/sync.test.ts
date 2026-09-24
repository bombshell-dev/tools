import { lstat, readlink } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { createFixture, createMocks } from '../test-utils/index.ts';
import { copySkills, findParentPackage, updateAgentsMd } from './sync.ts';

describe('copySkills', () => {
	it('symlinks each skill into the destination', async () => {
		const fixture = await createFixture({
			'source-skills': {
				build: {
					'SKILL.md': '---\nname: build\ndescription: Build the project.\n---\nbody',
				},
			},
		});

		const source = new URL('source-skills/', fixture.root);
		const dest = new URL('project/skills/', fixture.root);

		const skills = await copySkills({ source, dest });

		expect(skills).toEqual([{ name: 'build', description: 'Build the project.' }]);

		// The destination entry must be a symlink, not a copy.
		const linkPath = fileURLToPath(new URL('build', dest));
		expect((await lstat(linkPath)).isSymbolicLink()).toBe(true);

		// And it must resolve back to the source skill.
		expect(await readlink(linkPath)).toBe('../../source-skills/build');

		// Reading through the link reaches the real file.
		expect(await fixture.text('project/skills/build/SKILL.md')).toContain('name: build');
	});

	it('is idempotent and never touches the source on re-sync', async () => {
		const fixture = await createFixture({
			'source-skills': {
				build: {
					'SKILL.md': '---\nname: build\ndescription: Build the project.\n---\nbody',
				},
			},
		});

		const source = new URL('source-skills/', fixture.root);
		const dest = new URL('project/skills/', fixture.root);

		const first = await copySkills({ source, dest });
		// Re-running must not throw and must yield the same result.
		const second = await copySkills({ source, dest });

		expect(second).toEqual(first);
		// The source skill files must survive a re-sync.
		expect(await fixture.text('source-skills/build/SKILL.md')).toContain('name: build');
		expect(await fixture.text('project/skills/build/SKILL.md')).toContain('name: build');
	});

	it('reads block scalar descriptions without the indicator', async () => {
		const fixture = await createFixture({
			'source-skills': {
				test: {
					'SKILL.md':
						'---\nname: test\ndescription: >\n  Vitest test runner with colocated .test.ts files.\n  Use when writing tests.\nmetadata:\n  type: core\n---\nbody',
				},
				lint: {
					'SKILL.md': '---\nname: lint\ndescription: |-\n  Lint the project.\n---\nbody',
				},
			},
		});

		const skills = await copySkills({
			source: new URL('source-skills/', fixture.root),
			dest: new URL('project/skills/', fixture.root),
		});

		expect(skills).toEqual(
			expect.arrayContaining([
				{
					name: 'test',
					description: 'Vitest test runner with colocated .test.ts files. Use when writing tests.',
				},
				{ name: 'lint', description: 'Lint the project.' },
			]),
		);
	});
});

describe('updateAgentsMd', () => {
	it('summarizes each skill with its first full sentence', async () => {
		const fixture = await createFixture({ 'AGENTS.md': '# Project\n' });

		await updateAgentsMd({
			root: fixture.root,
			skills: [
				{
					name: 'test',
					description: 'Vitest test runner with colocated .test.ts files. Use when writing tests.',
				},
			],
		});

		expect(await fixture.text('AGENTS.md')).toContain(
			'- **test** — [skills/test/SKILL.md](skills/test/SKILL.md) - Vitest test runner with colocated .test.ts files\n',
		);
	});
});

describe('findParentPackage', () => {
	it('resolves the project root from INIT_CWD, not from this package', async () => {
		const fixture = await createFixture({
			project: {
				'package.json': '{ "name": "my-app" }',
				nested: {},
			},
		});
		createMocks({ env: { INIT_CWD: fileURLToPath(new URL('project/nested/', fixture.root)) } });

		const found = await findParentPackage();

		expect(found).toBe(fileURLToPath(new URL('project/package.json', fixture.root)));
	});

	it('returns null when invoked inside @bomb.sh/tools itself', async () => {
		const fixture = await createFixture({
			'package.json': '{ "name": "@bomb.sh/tools" }',
		});
		createMocks({ env: { INIT_CWD: fileURLToPath(fixture.root) } });

		expect(await findParentPackage()).toBe(null);
	});
});
