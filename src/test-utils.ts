import type { PathLike } from "node:fs";
import { mkdtemp, mkdir, writeFile, rm, readFile as fsReadFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { onTestFinished } from "vitest";

export interface Fixture {
  root: URL;
  resolve: (...segments: string[]) => URL;
  readFile: (file: PathLike) => Promise<string>;
  cleanup: () => Promise<void>;
}

export async function createFixture(files: Record<string, string>): Promise<Fixture> {
  const root = new URL(`bsh-`, `file://${tmpdir()}/`);
  const path = await mkdtemp(fileURLToPath(root));
  const base = pathToFileURL(path + sep);

  for (const [name, content] of Object.entries(files)) {
    const url = new URL(name, base);
    const dir = new URL("./", url);
    await mkdir(dir, { recursive: true });
    await writeFile(url, content, "utf8");
  }

  const cleanup = () => rm(path, { recursive: true, force: true });
  onTestFinished(cleanup);

  const resolve = (...segments: string[]) => new URL(`./${segments.join("/")}`, base);
  const readFile = (file: PathLike) =>
    fsReadFile(new URL(`./${file}`, base), { encoding: "utf-8" });

  return {
    root: pathToFileURL(path),
    resolve,
    readFile,
    cleanup,
  };
}
