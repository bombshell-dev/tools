import { describe, it, expect } from "vitest";
import { createMocks } from "./mock.ts";
import { MockReadable, MockWritable } from "./stdio.ts";

describe("createMocks", () => {
  it("returns undefined streams when not requested", () => {
    const mocks = createMocks();
    expect(mocks.input).toBeUndefined();
    expect(mocks.output).toBeUndefined();
  });

  it("creates input stream with `true`", () => {
    const mocks = createMocks({ input: true });
    expect(mocks.input).toBeInstanceOf(MockReadable);
  });

  it("creates output stream with `true`", () => {
    const mocks = createMocks({ output: true });
    expect(mocks.output).toBeInstanceOf(MockWritable);
  });

  it("passes config to output stream", () => {
    const mocks = createMocks({ output: { columns: 120, rows: 40, isTTY: true } });
    expect(mocks.output.columns).toBe(120);
    expect(mocks.output.rows).toBe(40);
    expect(mocks.output.isTTY).toBe(true);
  });

  it("passes config to input stream", () => {
    const mocks = createMocks({ input: { isTTY: true } });
    expect(mocks.input.isTTY).toBe(true);
  });

  it("stubs env vars for duration of test", () => {
    createMocks({ env: { TEST_MOCK_VAR: "hello" } });
    expect(process.env.TEST_MOCK_VAR).toBe("hello");
  });

  it("restores env vars after test finishes", async () => {
    // Previous test's onTestFinished should have cleaned up
    expect(process.env.TEST_MOCK_VAR).toBeUndefined();
  });
});
