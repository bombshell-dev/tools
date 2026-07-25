import { describe, it, expect } from 'vitest';
import { createFixture } from './test-utils/index.ts';
import { getPublicSurface } from './surface.ts';

describe('getPublicSurface', () => {
	it('maps exports dist paths back to src', async () => {
		const fixture = await createFixture({
			'package.json': {
				name: 'test-pkg',
				exports: {
					'.': { types: './dist/index.d.mts', import: './dist/index.mjs' },
					'./utils': './dist/utils.mjs',
				},
			},
		});
		const surface = await getPublicSurface(fixture.root);
		expect(surface.sort()).toEqual(['src/index.ts', 'src/utils.ts']);
	});

	it('maps bin entries to src', async () => {
		const fixture = await createFixture({
			'package.json': { name: 'test-cli', bin: { 'test-cli': './dist/cli.mjs' } },
		});
		const surface = await getPublicSurface(fixture.root);
		expect(surface).toEqual(['src/cli.ts']);
	});

	it('skips wildcard passthrough exports', async () => {
		const fixture = await createFixture({
			'package.json': {
				name: 'test-pkg',
				exports: { '.': './dist/index.mjs', './*': './dist/*' },
			},
		});
		const surface = await getPublicSurface(fixture.root);
		expect(surface).toEqual(['src/index.ts']);
	});

	it('keeps source-exporting packages as-is', async () => {
		const fixture = await createFixture({
			'package.json': { name: 'test-pkg', exports: './src/index.ts' },
		});
		const surface = await getPublicSurface(fixture.root);
		expect(surface).toEqual(['src/index.ts']);
	});

	it('falls back to main/module when exports is absent', async () => {
		const fixture = await createFixture({
			'package.json': { name: 'test-pkg', main: './dist/index.cjs', module: './dist/index.mjs' },
		});
		const surface = await getPublicSurface(fixture.root);
		expect(surface).toEqual(['src/index.ts']);
	});

	it('ignores non-code targets', async () => {
		const fixture = await createFixture({
			'package.json': {
				name: 'test-pkg',
				exports: {
					'.': './dist/index.mjs',
					'./package.json': './package.json',
					'./skills/*': './skills/*',
					'./styles.css': './dist/styles.css',
				},
			},
		});
		const surface = await getPublicSurface(fixture.root);
		expect(surface).toEqual(['src/index.ts']);
	});

	it('returns empty for packages without a publish surface', async () => {
		const fixture = await createFixture({
			'package.json': { name: 'test-app', private: true },
		});
		const surface = await getPublicSurface(fixture.root);
		expect(surface).toEqual([]);
	});

	it('collects surface from conventional workspace packages', async () => {
		const fixture = await createFixture({
			'package.json': { name: 'test-mono', private: true },
			packages: {
				alpha: {
					'package.json': { name: 'alpha', exports: './dist/index.mjs' },
				},
				beta: {
					'package.json': {
						name: 'beta',
						exports: { '.': './dist/mod.mjs', './extra': './dist/extra.mjs' },
					},
				},
			},
		});
		const surface = await getPublicSurface(fixture.root);
		expect(surface.sort()).toEqual([
			'packages/alpha/src/index.ts',
			'packages/beta/src/extra.ts',
			'packages/beta/src/mod.ts',
		]);
	});
});
