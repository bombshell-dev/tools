import { fileURLToPath, pathToFileURL } from 'node:url';

export function local(file: string) {
	return fileURLToPath(new URL(`../node_modules/.bin/${file}`, import.meta.url));
}

/** Error class for `bsh` failures. Carries a stable, greppable code. */
export class ToolsError extends Error {
	code: string;

	constructor(message: string, code: string) {
		super(message);
		this.name = 'ToolsError';
		this.code = code;
	}
}

/**
 * Compute a relative path from one directory URL to another, for APIs that
 * require a string path (e.g. `fs.symlink` targets). POSIX-style — forward
 * slashes are accepted by every platform Node supports for this purpose.
 */
export function relativeUrlPath(from: URL, to: URL): string {
	const fromParts = from.pathname.split('/').filter(Boolean);
	const toParts = to.pathname.split('/').filter(Boolean);
	let common = 0;
	while (
		common < fromParts.length &&
		common < toParts.length &&
		fromParts[common] === toParts[common]
	) {
		common++;
	}
	const ups = fromParts.length - common;
	const parts = [...Array<string>(ups).fill('..'), ...toParts.slice(common)];
	return parts.map(decodeURIComponent).join('/');
}

/**
 * Resolve a symlink target (as returned by `fs.readlink`, which may be
 * relative to the link's directory) to an absolute URL.
 */
export function resolveLinkTarget(linkDir: URL, target: string): URL {
	if (target.startsWith('/') || /^[a-zA-Z]:[\\/]/.test(target)) {
		return pathToFileURL(target);
	}
	return new URL(target, linkDir);
}
