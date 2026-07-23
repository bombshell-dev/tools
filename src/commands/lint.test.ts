import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createFixture } from '../test-utils/index.ts';
import { runOxlint, runKnip, runKnipFix } from './lint.ts';
import { fileURLToPath } from 'node:url';

describe('lint command', () => {
	let originalCwd: string;
	let fixture: Awaited<ReturnType<typeof createFixture>>;

	beforeEach(() => {
		originalCwd = process.cwd();
	});

	afterEach(async () => {
		process.chdir(originalCwd);
		if (fixture) await fixture.cleanup();
	});

	describe('runOxlint', () => {
		it('detects violations in bad code', async () => {
			fixture = await createFixture({
				src: {
					'index.ts': 'var x = 1;',
				},
			});
			process.chdir(fileURLToPath(fixture.root));

			const violations = await runOxlint(['./src']);

			expect(violations).not.toEqual([]);
			expect(violations).toMatchSnapshot();
		});

		it('returns empty array for clean code', async () => {
			fixture = await createFixture({
				src: {
					'index.ts': `
						export const x = 1;
					`,
				},
			});
			process.chdir(fileURLToPath(fixture.root));

			const violations = await runOxlint(['./src']);

			expect(violations).toEqual([]);
		});
		it('auto-fixes console.log to console.info', async () => {
			fixture = await createFixture({
				src: {
					'index.ts': 'console.log("hello");\nconsole.info("ok");\n',
				},
			});
			process.chdir(fileURLToPath(fixture.root));

			await runOxlint(['./src'], true);

			expect(await fixture.text('src/index.ts')).toBe(
				'console.info("hello");\nconsole.info("ok");\n',
			);
		});
	});

	describe('runKnipFix', () => {
		it('removes unused dependencies from package.json', async () => {
			fixture = await createFixture({
				'package.json': {
					name: 'test-pkg',
					version: '1.0.0',
					type: 'module',
					exports: './src/index.ts',
					dependencies: { 'left-pad': '^1.3.0' },
				},
				src: {
					'index.ts': 'export const value = 42;\n',
				},
			});
			process.chdir(fileURLToPath(fixture.root));

			const before = await runKnip();
			expect(before.some((v) => v.code === 'unused-dependency')).toBe(true);

			await runKnipFix();

			const pkg = (await fixture.json('package.json')) as { dependencies?: unknown };
			expect(pkg.dependencies ?? {}).toEqual({});
			expect(await runKnip()).toEqual([]);
		});
	});

	describe('runKnip', () => {
		it('detects unused exports and unused files', async () => {
			fixture = await createFixture({
				'package.json': {
					name: 'test-pkg',
					version: '1.0.0',
					type: 'module',
					exports: './src/index.ts',
				},
				src: {
					'index.ts': `
						import { used } from "./used";
						console.log(used);
						export const value = 42; 
					`,
					'used.ts': `
						export const used = "used";
						export const unusedExport = "unusedExport";
					`,
					'unused-file.ts': `
						export const unused = "unused";
					`,
				},
			});
			process.chdir(fileURLToPath(fixture.root));

			const violations = await runKnip();

			expect(violations).not.toEqual([]);
			expect(violations).toMatchSnapshot();
		});
	});
});
