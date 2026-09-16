import { fileURLToPath } from 'node:url';
import { x } from 'tinyexec';
import { describe, it, expect } from 'vitest';
import { createFixture } from '../test-utils/index.ts';

const bin = fileURLToPath(new URL('../bin.ts', import.meta.url));

describe('format command', () => {
	it('applies the shared ignore patterns to the project being formatted', async () => {
		const fixture = await createFixture({
			src: { 'a.ts': 'const a={b:1}\n' },
			'data.json': '{"a":1}',
			'config.jsonc': '{"a":1}',
			'README.md': '* item\n',
			docs: { 'nested.md': '* item\n' },
			'.github/workflows/ci.yml': 'a:   1\n',
		});

		const result = await x(
			process.execPath,
			['--experimental-strip-types', '--no-warnings', bin, 'format', '--list-different'],
			{ nodeOptions: { cwd: fileURLToPath(fixture.root) }, throwOnError: false },
		);

		expect(result.stdout.trim().split('\n').toSorted()).toEqual(['src/a.ts']);
	});
});
