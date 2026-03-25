import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { createFixture } from "./test-utils.ts";

describe("createFixture", () => {
  it("creates files on disk from inline tree", async () => {
    const fixture = await createFixture({
      "hello.txt": "hello world",
    });
    const content = await readFile(fixture.resolve("hello.txt"), "utf8");
    expect(content).toBe("hello world");
  });

  it("creates nested directories from slash-separated keys", async () => {
    const fixture = await createFixture({
      "src/index.ts": "export const x = 1",
      "src/utils/helpers.ts": "export function help() {}",
    });
    expect(existsSync(fixture.resolve("src/index.ts"))).toBe(true);
    expect(existsSync(fixture.resolve("src/utils/helpers.ts"))).toBe(true);
  });

  it("resolve returns absolute path within fixture root", async () => {
    const fixture = await createFixture({ "a.txt": "" });
    expect(fixture.resolve("a.txt").toString()).toContain(fixture.root.toString());
  });

  it("readFile reads the actual file", async () => {
    const fixture = await createFixture({ "a.txt": "Empty" });
    expect(await fixture.readFile("a.txt")).toEqual("Empty");
    await writeFile(fixture.resolve("a.txt"), "Hello world!", { encoding: "utf-8" });
    expect(await fixture.readFile("a.txt")).toEqual("Hello world!");
  });

  it("cleanup removes the temp directory", async () => {
    const fixture = await createFixture({ "a.txt": "" });
    const path = fixture.root;
    expect(existsSync(path)).toBe(true);
    await fixture.cleanup();
    expect(existsSync(path)).toBe(false);
  });
});
