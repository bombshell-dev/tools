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
	});

	describe('bombshell-dev/max-params', () => {
		it('flags authored signatures but not conformance to external APIs', async () => {
			fixture = await createFixture({
				src: {
					'index.ts': `
						export function fourParams(a: number, b: number, c: number, d: number): number { return a + b + c + d; }
						export const arrow = (a: number, b: number, c: number): number => a + b + c;
						class Point { constructor(x: number, y: number, z: number) { void x; void y; void z; } }

						interface Listener { on(event: string, data: unknown, ctx: unknown): void }
						class MyListener implements Listener {
							on(event: string, data: unknown, ctx: unknown): void { void event; void data; void ctx; }
						}

						class Base { render(a: string, b: string, c: string): void { void a; void b; void c; } }
						class Sub extends Base {
							override render(a: string, b: string, c: string): void { void a; void b; void c; }
						}

						const handlers = {
							handle(a: string, b: string, c: string): void { void a; void b; void c; },
						};
						[1].forEach((a, b, c) => { void a; void b; void c; });
						void handlers; void Point; void MyListener; void Sub;
					`,
				},
			});
			process.chdir(fileURLToPath(fixture.root));

			const violations = await runOxlint(['./src']);
			const maxParams = violations.filter((v) => v.code === 'bombshell-dev(max-params)');

			expect(maxParams.map((v) => v.line).sort((a, b) => a - b)).toEqual([2, 3, 4, 11]);
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
