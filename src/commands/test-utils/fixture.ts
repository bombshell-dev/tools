import { mkdtemp, symlink as fsSymlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { NodeHfs } from "@humanfs/node";
import type { HfsImpl } from "@humanfs/types";
import { expect, onTestFinished } from "vitest";

interface ScopedHfsImpl extends Required<HfsImpl> {
  text(file: string | URL): Promise<string | undefined>;
  json(file: string | URL): Promise<unknown | undefined>;
}

/**
 * A temporary fixture directory with a scoped `hfs` filesystem.
 *
 * Includes all `hfs` methods — paths are resolved relative to the fixture root.
 */
export interface Fixture extends ScopedHfsImpl {
  /** The fixture root as a `file://` URL. */
  root: URL;
  /** Resolve a relative path within the fixture root. */
  resolve: (...segments: string[]) => URL;
  /** Delete the fixture directory. Also runs automatically via `onTestFinished`. */
  cleanup: () => Promise<void>;
}

/** Context passed to dynamic file content functions. */
export interface FileContext {
  /**
   * Metadata about the fixture root, analogous to `import.meta`.
   *
   * - `url` — the fixture root as a `file://` URL string
   * - `filename` — absolute filesystem path to the fixture root
   * - `dirname` — same as `filename` (root is a directory)
   * - `resolve(path)` — resolve a relative path against the fixture root
   */
  importMeta: {
    url: string;
    filename: string;
    dirname: string;
    resolve: (path: string) => string;
  };
  /**
   * Create a symbolic link to `target`.
   *
   * Returns a `SymlinkMarker` — the fixture will create the symlink on disk.
   *
   * @example
   * ```ts
   * { 'link.txt': ({ symlink }) => symlink('./target.txt') }
   * ```
   */
  symlink: (target: string) => SymlinkMarker;
}

const SYMLINK = Symbol("symlink");

/** Opaque marker returned by `ctx.symlink()`. */
export interface SymlinkMarker {
  [SYMLINK]: true;
  target: string;
}

/**
 * A value in the file tree.
 *
 * | Type | Example |
 * |------|---------|
 * | `string` | `'file content'` |
 * | `object` / `array` | `{ name: 'cool' }` — auto-serialized as JSON for `.json` keys |
 * | `Buffer` | `Buffer.from([0x89, 0x50])` |
 * | Nested directory | `{ dir: { 'file.txt': 'content' } }` |
 * | Function | `({ importMeta, symlink }) => symlink('./target')` |
 */
export type FileTreeValue =
  | string
  | Buffer
  | Record<string, unknown>
  | unknown[]
  | FileTree
  | ((ctx: FileContext) => string | Buffer | SymlinkMarker);

/** A recursive tree of files and directories. */
export interface FileTree {
  [key: string]: FileTreeValue;
}

function isSymlinkMarker(value: unknown): value is SymlinkMarker {
  return typeof value === "object" && value !== null && SYMLINK in value;
}

function isFileTree(value: unknown): value is FileTree {
  return (
    typeof value === "object" &&
    value !== null &&
    !Buffer.isBuffer(value) &&
    !Array.isArray(value) &&
    !isSymlinkMarker(value)
  );
}

function scopeHfs(inner: NodeHfs, base: URL): ScopedHfsImpl {
  const r = (p: string | URL) => new URL(`./${p}`, base);
  const r2 = (a: string | URL, b: string | URL) => [r(a), r(b)] as const;

  return {
    text: (p: string | URL) => inner.text(r(p)),
    json: (p: string | URL) => inner.json(r(p)),
    bytes: (p) => inner.bytes(r(p)),
    write: (p, c) => inner.write(r(p), c),
    append: (p, c) => inner.append(r(p), c),
    isFile: (p) => inner.isFile(r(p)),
    isDirectory: (p) => inner.isDirectory(r(p)),
    createDirectory: (p) => inner.createDirectory(r(p)),
    delete: (p) => inner.delete(r(p)),
    deleteAll: (p) => inner.deleteAll(r(p)),
    list: (p) => inner.list(r(p)),
    size: (p) => inner.size(r(p)),
    lastModified: (p) => inner.lastModified(r(p)),
    copy: (s, d) => inner.copy(...r2(s, d)),
    copyAll: (s, d) => inner.copyAll(...r2(s, d)),
    move: (s, d) => inner.move(...r2(s, d)),
    moveAll: (s, d) => inner.moveAll(...r2(s, d)),
  };
}

/**
 * Create a temporary fixture directory from an inline file tree.
 *
 * Returns a {@link Fixture} with all `hfs` methods scoped to the fixture root.
 *
 * @example
 * ```ts
 * const fixture = await createFixture({
 *   'hello.txt': 'hello world',
 *   'package.json': { name: 'test', version: '1.0.0' },
 *   'icon.png': Buffer.from([0x89, 0x50]),
 *   src: {
 *     'index.ts': 'export default 1',
 *   },
 *   'link.txt': ({ symlink }) => symlink('./hello.txt'),
 *   'info.txt': ({ importMeta }) => `Root: ${importMeta.url}`,
 * })
 *
 * const text = await fixture.text('hello.txt')
 * const json = await fixture.json('package.json')
 * ```
 */
export async function createFixture(files: FileTree): Promise<Fixture> {
  const raw = expect.getState().currentTestName ?? "bsh";
  const prefix = raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const root = new URL(`${prefix}-`, `file://${tmpdir()}/`);
  const path = await mkdtemp(fileURLToPath(root));
  const base = pathToFileURL(path + sep);

  const inner = new NodeHfs();
  const scoped = scopeHfs(inner, base);
  const resolve = (...segments: string[]) => new URL(`./${segments.join("/")}`, base);

  const ctx: FileContext = {
    importMeta: {
      url: base.toString(),
      filename: fileURLToPath(base),
      dirname: fileURLToPath(base),
      resolve: (p: string) => new URL(`./${p}`, base).toString(),
    },
    symlink: (target: string): SymlinkMarker => ({ [SYMLINK]: true, target }),
  };

  async function writeTree(tree: FileTree, dir: URL): Promise<void> {
    for (const [name, raw] of Object.entries(tree)) {
      const url = new URL(name, dir);

      // Nested directory object (not a plain value)
      if (
        typeof raw !== "function" &&
        !Buffer.isBuffer(raw) &&
        !Array.isArray(raw) &&
        isFileTree(raw) &&
        !name.includes(".")
      ) {
        await inner.createDirectory(url);
        // Trailing slash so nested entries resolve relative to the dir
        await writeTree(raw, new URL(`${url}/`));
        continue;
      }

      // Ensure parent directory exists
      const parent = new URL("./", url);
      await inner.createDirectory(parent);

      // Resolve functions
      const content = typeof raw === "function" ? raw(ctx) : raw;

      // Symlink
      if (isSymlinkMarker(content)) {
        await fsSymlink(content.target, url);
        continue;
      }

      // Buffer
      if (Buffer.isBuffer(content)) {
        await inner.write(url, content);
        continue;
      }

      // JSON auto-serialization for .json files with non-string content
      if (name.endsWith(".json") && typeof content !== "string") {
        await inner.write(url, JSON.stringify(content, null, 2));
        continue;
      }

      // String content
      await inner.write(url, content as string);
    }
  }

  await writeTree(files, base);

  const cleanup = () => inner.deleteAll(path).then(() => undefined);
  onTestFinished(cleanup);

  return {
    root: base,
    resolve,
    cleanup,
    ...scoped,
  };
}
