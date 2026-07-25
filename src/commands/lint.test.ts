import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createFixture } from '../test-utils/index.ts';
import { runOxlint, runKnip } from './lint.ts';
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

		it('scopes surface rules to the public API surface', async () => {
			fixture = await createFixture({
				'package.json': {
					name: 'test-pkg',
					exports: { '.': './dist/index.mjs' },
				},
				src: {
					'index.ts': 'export function syncPublic() { return 1; }\n',
					'internal.ts': 'export function syncInternal() { return 2; }\n',
				},
			});
			process.chdir(fileURLToPath(fixture.root));

			const violations = await runOxlint(['./src']);
			const asyncWarnings = violations.filter(
				(v) => v.code === 'bombshell-dev(exported-function-async)',
			);

			expect(asyncWarnings).toHaveLength(1);
			expect(asyncWarnings[0]!.file).toBe('src/index.ts');
		});

		it('silences surface rules for packages without a publish surface', async () => {
			fixture = await createFixture({
				'package.json': { name: 'test-app', private: true },
				src: {
					'index.ts': 'export function syncInternal() { return 1; }\n',
				},
			});
			process.chdir(fileURLToPath(fixture.root));

			const violations = await runOxlint(['./src']);

			expect(violations.filter((v) => v.code === 'bombshell-dev(exported-function-async)')).toEqual(
				[],
			);
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
