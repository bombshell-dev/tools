import { realpath } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { x } from 'tinyexec';
import { describe, it, expect } from 'vitest';
import { createFixture } from './index.ts';

const bin = fileURLToPath(new URL('../bin.ts', import.meta.url));

describe('shared vitest config', () => {
	it('skips test files inside nested node_modules', async () => {
		const fixture = await createFixture({
			'package.json': { name: 'root', private: true, type: 'module' },
			packages: {
				core: {
					'package.json': { name: '@demo/core', type: 'module' },
					src: {
						'a.test.ts':
							"import { it, expect } from 'vitest';\nit('ok', () => { expect(1).toBe(1); });\n",
					},
				},
			},
			examples: {
				basic: {
					node_modules: {
						'@demo': {
							core: ({ symlink }) => symlink('../../../../packages/core'),
						},
					},
				},
			},
		});
		const root = await realpath(fileURLToPath(fixture.root));

		await x(
			process.execPath,
			[
				'--experimental-strip-types',
				'--no-warnings',
				bin,
				'test',
				'--reporter=json',
				'--outputFile=report.json',
			],
			{ nodeOptions: { cwd: root }, throwOnError: false },
		);

		const report = (await fixture.json('report.json')) as { testResults: { name: string }[] };
		expect(report.testResults.map((file) => file.name.slice(root.length + 1))).toEqual([
			'packages/core/src/a.test.ts',
		]);
	});
});
