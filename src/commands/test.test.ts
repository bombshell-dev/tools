import { fileURLToPath } from 'node:url';
import { x } from 'tinyexec';
import { describe, it, expect } from 'vitest';
import { createFixture } from '../test-utils/index.ts';

const bin = fileURLToPath(new URL('../bin.ts', import.meta.url));

async function runBshTest(assertion: string): Promise<number | undefined> {
	const fixture = await createFixture({
		'package.json': { name: 'test-pkg', type: 'module' },
		'index.test.ts': `import { it, expect } from 'vitest';\nit('case', () => { ${assertion} });\n`,
	});
	const result = await x(
		process.execPath,
		['--experimental-strip-types', '--no-warnings', bin, 'test'],
		{ nodeOptions: { cwd: fileURLToPath(fixture.root) }, throwOnError: false },
	);
	return result.exitCode;
}

describe('test command', () => {
	it('exits non-zero when a test fails', async () => {
		expect(await runBshTest('expect(1).toBe(2);')).toBe(1);
	});

	it('exits zero when all tests pass', async () => {
		expect(await runBshTest('expect(1).toBe(1);')).toBe(0);
	});
});
