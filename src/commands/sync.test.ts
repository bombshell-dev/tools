import { lstat, readlink } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { createFixture } from '../test-utils/index.ts';
import { copySkills } from './sync.ts';

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
});
