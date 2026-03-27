import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import { createFixture } from "./fixture.ts";

describe("createFixture", () => {
  it("creates files on disk from inline tree", async () => {
    const fixture = await createFixture({
      "hello.txt": "hello world",
    });
    expect(await fixture.text("hello.txt")).toBe("hello world");
  });

  it("creates nested directories from slash-separated keys", async () => {
    const fixture = await createFixture({
      "src/index.ts": "export const x = 1",
      "src/utils/helpers.ts": "export function help() {}",
    });
    expect(await fixture.isFile("src/index.ts")).toBe(true);
    expect(await fixture.isFile("src/utils/helpers.ts")).toBe(true);
  });

  it("resolve returns absolute path within fixture root", async () => {
    const fixture = await createFixture({ "a.txt": "" });
    expect(fixture.resolve("a.txt").toString()).toContain(fixture.root.toString());
  });

  it("text reads the actual file", async () => {
    const fixture = await createFixture({ "a.txt": "Empty" });
    expect(await fixture.text("a.txt")).toEqual("Empty");
    await fixture.write("a.txt", "Hello world!");
    expect(await fixture.text("a.txt")).toEqual("Hello world!");
  });

  it("cleanup removes the temp directory", async () => {
    const fixture = await createFixture({ "a.txt": "" });
    const path = fixture.root;
    expect(await fixture.isDirectory(fixture.root)).toBe(true);
    await fixture.cleanup();
    expect(existsSync(path)).toBe(false);
  });
});
