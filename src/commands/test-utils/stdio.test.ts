import { describe, it, expect } from "vitest";
import { MockReadable, MockWritable } from "./stdio.ts";

describe("MockReadable", () => {
  it("defaults to non-TTY", () => {
    const r = new MockReadable();
    expect(r.isTTY).toBe(false);
    expect(r.isRaw).toBe(false);
  });

  it("respects isTTY config", () => {
    const r = new MockReadable({ isTTY: true });
    expect(r.isTTY).toBe(true);
  });

  it("setRawMode enables raw mode", () => {
    const r = new MockReadable();
    r.setRawMode();
    expect(r.isRaw).toBe(true);
  });

  it("pushValue delivers data on read", () =>
    new Promise<void>((resolve) => {
      const r = new MockReadable();
      r.on("data", (chunk) => {
        expect(chunk.toString()).toBe("hello");
        resolve();
      });
      r.pushValue("hello");
    }));

  it("close ends the stream", async () => {
    const r = new MockReadable();
    r.close();

    const chunks: string[] = [];
    for await (const chunk of r) {
      chunks.push(chunk.toString());
    }
    expect(chunks).toEqual([]);
  });
});

describe("MockWritable", () => {
  it("defaults to 80x20 non-TTY", () => {
    const w = new MockWritable();
    expect(w.isTTY).toBe(false);
    expect(w.columns).toBe(80);
    expect(w.rows).toBe(20);
  });

  it("accepts custom config", () => {
    const w = new MockWritable({ columns: 120, rows: 40, isTTY: true });
    expect(w.isTTY).toBe(true);
    expect(w.columns).toBe(120);
    expect(w.rows).toBe(40);
  });

  it("captures written chunks", () => {
    const w = new MockWritable();
    w.write("hello");
    w.write(" world");
    expect(w.buffer).toEqual(["hello", " world"]);
  });

  it("resize updates dimensions and emits event", () => {
    const w = new MockWritable({ columns: 80, rows: 20 });
    let resized = false;
    w.on("resize", () => {
      resized = true;
    });

    w.resize(120, 40);

    expect(w.columns).toBe(120);
    expect(w.rows).toBe(40);
    expect(resized).toBe(true);
  });
});
