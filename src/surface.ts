import { NodeHfs } from '@humanfs/node';

const hfs = new NodeHfs();

/**
 * A `package.json` shape covering the publish-surface fields we read.
 * Everything is optional — real-world manifests are messy.
 */
interface PackageJson {
	main?: unknown;
	module?: unknown;
	bin?: unknown;
	exports?: unknown;
}

/**
 * Compute the public API surface of the package(s) rooted at `root`.
 *
 * The public surface is the set of source files consumers can import —
 * derived from `package.json` `exports`, `bin`, and `main`/`module` fields
 * by mapping published `dist/` paths back to their `src/` origins.
 *
 * Returns oxlint-style glob patterns relative to `root`. Packages without a
 * publish surface (apps, examples, private tooling) yield an empty array —
 * surface-scoped lint rules stay silent there.
 *
 * Monorepos are handled by convention: each `packages/<name>/package.json`
 * contributes its own surface, prefixed with `packages/<name>/`.
 */
export async function getPublicSurface(root: URL): Promise<string[]> {
	const patterns = new Set<string>();

	const roots = new Map<string, URL>([['', root]]);
	const packagesDir = new URL('packages/', root);
	if (await hfs.isDirectory(packagesDir)) {
		for await (const entry of hfs.list(packagesDir)) {
			if (!entry.isDirectory) continue;
			const pkgRoot = new URL(`packages/${entry.name}/`, root);
			if (await hfs.isFile(new URL('package.json', pkgRoot))) {
				roots.set(`packages/${entry.name}`, pkgRoot);
			}
		}
	}

	for (const [prefix, pkgRoot] of roots) {
		const pkg = (await hfs.json(new URL('package.json', pkgRoot))) as PackageJson | undefined;
		if (!pkg) continue;
		for (const pattern of surfacePatterns(pkg)) {
			patterns.add(prefix ? `${prefix}/${pattern}` : pattern);
		}
	}

	return [...patterns];
}

/** Map a package.json's publish fields to source glob patterns. */
function surfacePatterns(pkg: PackageJson): string[] {
	const targets = new Set<string>();

	if (pkg.exports !== undefined) {
		for (const value of walkExports(pkg.exports)) targets.add(value);
	} else {
		// Legacy fields only apply when `exports` is absent
		if (typeof pkg.main === 'string') targets.add(pkg.main);
		if (typeof pkg.module === 'string') targets.add(pkg.module);
	}
	if (typeof pkg.bin === 'string') {
		targets.add(pkg.bin);
	} else if (pkg.bin && typeof pkg.bin === 'object') {
		for (const value of Object.values(pkg.bin)) {
			if (typeof value === 'string') targets.add(value);
		}
	}

	const patterns = new Set<string>();
	for (const target of targets) {
		const pattern = toSourcePattern(target);
		if (pattern) patterns.add(pattern);
	}
	return [...patterns];
}

/** Collect every string leaf from an `exports` value of any shape. */
function* walkExports(value: unknown): Generator<string> {
	if (typeof value === 'string') {
		yield value;
	} else if (Array.isArray(value)) {
		for (const item of value) yield* walkExports(item);
	} else if (value && typeof value === 'object') {
		for (const item of Object.values(value)) yield* walkExports(item);
	}
}

/**
 * Map a published file target back to its source glob pattern.
 *
 * - `./dist/index.mjs` → `src/index.ts`
 * - `./src/index.ts` (source-exporting packages) → `src/index.ts`
 *
 * Wildcard passthroughs (`"./*": "./dist/*"`) are skipped: they make files
 * importable by convention, but don't designate a curated public API, so
 * surface-scoped rules would fire on internal modules.
 *
 * Returns `undefined` for targets that aren't code entry points
 * (`./package.json`, asset paths, etc.).
 */
function toSourcePattern(target: string): string | undefined {
	if (!target.startsWith('./')) return undefined;
	let path = target.slice(2);

	// Published artifacts map back to src/; anything else must already be source
	if (path.startsWith('dist/')) {
		path = `src/${path.slice('dist/'.length)}`;
	} else if (!path.startsWith('src/')) {
		return undefined;
	}

	if (path.includes('*')) return undefined;

	const source = path.replace(/\.(d\.[cm]ts|[cm]?[jt]s)$/, '.ts');
	return source.endsWith('.ts') ? source : undefined;
}
