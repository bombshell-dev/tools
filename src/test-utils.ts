import type { PathLike } from "node:fs";
import { mkdtemp, mkdir, writeFile, rm, readFile as fsReadFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { expect, onTestFinished } from "vitest";

export interface Fixture {
  root: URL;
  resolve: (...segments: string[]) => URL;
  readFile: (file: PathLike) => Promise<string>;
  cleanup: () => Promise<void>;
}

type FileContent = string | Record<string, unknown> | unknown[];

export async function createFixture<const T extends Record<string, FileContent>>(files: {
  [K in keyof T]: K extends `${string}.json` ? FileContent : string;
}): Promise<Fixture> {
  const raw = expect.getState().currentTestName ?? "bsh";
  const prefix = raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const root = new URL(`${prefix}-`, `file://${tmpdir()}/`);
  const path = await mkdtemp(fileURLToPath(root));
  const base = pathToFileURL(path + sep);

  for (const [name, content] of Object.entries(files as Record<string, FileContent>)) {
    const url = new URL(name, base);
    const dir = new URL("./", url);
    await mkdir(dir, { recursive: true });
    if (name.endsWith(".json") && typeof content !== "string") {
      await writeFile(url, JSON.stringify(content, null, 2), "utf8");
    } else {
      await writeFile(url, content as string, "utf8");
    }
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
