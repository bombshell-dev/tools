---
name: test
description: >
  Vitest test runner with colocated .test.ts files and test utilities from
  @bomb.sh/tools/test-utils. Covers createFixture (temp directories, inline file trees,
  hfs API), createMocks (env stubbing, MockReadable/MockWritable streams, auto-cleanup),
  .test-d.ts type-level tests, and auto-loaded vitest config. Use when writing or
  running tests in Bombshell projects.
metadata:
  type: core
  library: '@bomb.sh/tools'
  library_version: '0.3.1'
  requires:
    - lifecycle
  sources:
    - 'bombshell-dev/tools:src/commands/test.ts'
    - 'bombshell-dev/tools:src/commands/test-utils/index.ts'
---

# Test

Vitest test runner with colocated test files, filesystem fixtures, and mock utilities.

## Setup

`bsh test` auto-loads its own vitest config — no `vitest.config.ts` needed in your project. The bundled config excludes `dist/`, sets `FORCE_COLOR=1`, and registers `vitest-ansi-serializer` for snapshot tests with ANSI output.

Run the full test suite:

```sh
pnpm run test
```

Filter to a specific file:

```sh
pnpm run test -- src/commands/build.test.ts
```

Pass any vitest flags after `--`:

```sh
pnpm run test -- --reporter=verbose
```

## Test File Conventions

Tests are colocated next to the source they test. Never use `__tests__/`, `test/`, or any other separate directory.

- **`.test.ts`** — runtime tests
- **`.test-d.ts`** — type-level tests (compile-time assertions only)

```
src/
  commands/
    build.ts
    build.test.ts
  framework/
    schema.ts
    schema.test.ts
    params.ts
    params.test-d.ts
  test-utils.ts
  test-utils.test.ts
```

## Core Patterns

### createFixture

Creates a temporary directory from an inline file tree. Returns a `Fixture` with filesystem methods scoped to that directory. Cleanup runs automatically via `onTestFinished`.

```ts
import { describe, it, expect } from "vitest";
import { createFixture } from "@bomb.sh/tools/test-utils";

describe("my-feature", () => {
  it("reads files from the fixture", async () => {
    const fixture = await createFixture({
      "hello.txt": "hello world",
      "package.json": { name: "test", version: "1.0.0" },
      "icon.png": Buffer.from([0x89, 0x50]),
      src: {
        "index.ts": "export default 1",
      },
      "link.txt": ({ symlink }) => symlink("./hello.txt"),
      "info.txt": ({ importMeta }) => `Root: ${importMeta.url}`,
    });

    expect(await fixture.text("hello.txt")).toBe("hello world");
    expect(await fixture.json("package.json")).toEqual({
      name: "test",
      version: "1.0.0",
    });
    expect(await fixture.isFile("src/index.ts")).toBe(true);
  });
});
```

### Fixture API

| Method | Returns | Description |
|--------|---------|-------------|
| `fixture.root` | `URL` | Fixture root as a `file://` URL |
| `fixture.resolve(...segments)` | `URL` | Resolve a relative path within the fixture root |
| `fixture.text(file)` | `Promise<string \| undefined>` | Read file contents as a string |
| `fixture.json(file)` | `Promise<unknown \| undefined>` | Read and parse a JSON file |
| `fixture.write(file, content)` | `Promise<void>` | Write a file to the fixture |
| `fixture.isFile(file)` | `Promise<boolean>` | Check if path is a file |
| `fixture.isDirectory(dir)` | `Promise<boolean>` | Check if path is a directory |
| `fixture.list(dir)` | `Promise<Iterable>` | List directory contents |
| `fixture.cleanup()` | `Promise<void>` | Delete the fixture directory (auto-runs via `onTestFinished`) |

All [`hfs`](https://github.com/humanwhocodes/humanfs) methods are available on the fixture, scoped to the fixture root. The table above covers the most common ones.

### File Tree Values

| Type | Behavior |
|------|----------|
| `string` | Written as-is |
| `object` / `array` | Auto-serialized as JSON for `.json` keys |
| `Buffer` | Written as binary |
| Nested object (key has no `.`) | Creates a subdirectory |
| `(ctx) => ...` | Dynamic — receives `importMeta` and `symlink` helpers |

The `importMeta` context provides:

- `importMeta.url` — fixture root as a `file://` URL string
- `importMeta.filename` — absolute filesystem path to the fixture root
- `importMeta.dirname` — same as `filename` (root is a directory)
- `importMeta.resolve(path)` — resolve a relative path against the fixture root

The `symlink` helper creates a symbolic link:

```ts
{
  "target.txt": "real content",
  "link.txt": ({ symlink }) => symlink("./target.txt"),
}
```

### createMocks

Creates a mock test environment with streams and env vars. Cleanup is automatic via `onTestFinished` — no `beforeAll`/`afterAll` needed.

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { createMocks, type Mocks } from "@bomb.sh/tools/test-utils";

describe("my-cli", () => {
  let mocks: Mocks;
  beforeEach(() => {
    mocks = createMocks({
      input: true,                            // MockReadable with defaults
      output: { columns: 120, isTTY: true },  // MockWritable
      env: { CI: "true", NO_COLOR: "1" },
    });
  });

  it("writes output", () => {
    render(mocks.input, mocks.output);
    expect(mocks.output.buffer.join("")).toContain("hello");
  });
});
```

#### createMocks Options

| Option | Type | Description |
|--------|------|-------------|
| `env` | `Record<string, string \| undefined>` | Environment variables to stub for the test duration |
| `input` | `true \| { isTTY?: boolean }` | Create a `MockReadable`. Pass `true` for defaults |
| `output` | `true \| { columns?: number; rows?: number; isTTY?: boolean }` | Create a `MockWritable`. Defaults: 80×20, non-TTY |

#### MockReadable

| Member | Type | Description |
|--------|------|-------------|
| `isTTY` | `boolean` | Whether the stream is a TTY |
| `isRaw` | `boolean` | Whether raw mode is enabled |
| `setRawMode()` | `() => void` | Enable raw mode |
| `pushValue(val)` | `(val: unknown) => void` | Push a value to the readable buffer |
| `close()` | `() => void` | Signal end of stream |

#### MockWritable

| Member | Type | Description |
|--------|------|-------------|
| `buffer` | `string[]` | All written chunks as strings |
| `isTTY` | `boolean` | Whether the stream is a TTY |
| `columns` | `number` | Terminal width (default 80) |
| `rows` | `number` | Terminal height (default 20) |
| `resize(columns, rows)` | `(columns: number, rows: number) => void` | Resize and emit `"resize"` event |

### Type-Level Tests

Files ending in `.test-d.ts` run compile-time type assertions using `expectTypeOf` from vitest. No runtime code executes — these tests verify that types resolve correctly.

```ts
import { describe, expectTypeOf, test } from "vitest";
import type { PathParams } from "./params.ts";

describe("PathParams", () => {
  test("extracts single param", () => {
    expectTypeOf({} as PathParams<"/users/[id]">).toMatchTypeOf<{
      id: string;
    }>();
  });

  test("extracts spread params", () => {
    expectTypeOf(
      {} as PathParams<"/files/[...path]">
    ).toMatchTypeOf<{ path: string[] }>();
  });

  test("no params returns empty object", () => {
    expectTypeOf({} as PathParams<"/static/page">).toMatchTypeOf<
      Record<string, never>
    >();
  });
});
```

## Common Mistakes

### HIGH: Placing tests in a separate directory

Tests must be colocated next to the source file they test.

```
# Wrong
__tests__/
  schema.test.ts
src/
  schema.ts

# Wrong
test/
  schema.test.ts
src/
  schema.ts

# Correct
src/
  schema.ts
  schema.test.ts
```

### MEDIUM: Extracting fixtures into shared variables

Fixtures must be declared inline in each test. Shared fixtures make tests coupled and hard to read.

```ts
// Wrong — shared fixture across tests
const sharedTree = {
  "package.json": { name: "test", version: "1.0.0" },
  "src/index.ts": "export default 1",
};

it("test a", async () => {
  const fixture = await createFixture(sharedTree);
  // ...
});

it("test b", async () => {
  const fixture = await createFixture(sharedTree);
  // ...
});

// Correct — each test declares its own fixture
it("test a", async () => {
  const fixture = await createFixture({
    "package.json": { name: "test", version: "1.0.0" },
  });
  // ...
});

it("test b", async () => {
  const fixture = await createFixture({
    "src/index.ts": "export default 1",
  });
  // ...
});
```

### HIGH: Testing implementation details instead of behavior

Write tests that verify observable outputs and side effects, not internal function calls, mock counts, or private state.

```ts
// Wrong — testing internal implementation
it("calls internal parser three times", async () => {
  const spy = vi.spyOn(internals, "parse");
  await processConfig(input);
  expect(spy).toHaveBeenCalledTimes(3);
});

// Correct — testing observable behavior
it("produces valid output from config", async () => {
  const fixture = await createFixture({
    "config.json": { entry: "src/index.ts" },
  });
  const result = await processConfig(fixture.root);
  expect(result.entry).toBe("src/index.ts");
});
```

### HIGH: Adding a vitest.config.ts

`bsh test` provides its own config. A project-level `vitest.config.ts` shadows the bsh defaults (ANSI serialization, dist exclusion, FORCE_COLOR).

```
# Wrong
vitest.config.ts exists in project root

# Correct
No vitest config — bsh handles it
```

### HIGH: Manual env/mock cleanup instead of createMocks

Use `createMocks` instead of manual `vi.stubEnv`/`vi.unstubAllEnvs` patterns. It auto-cleans via `onTestFinished`.

```ts
// Wrong — manual lifecycle
beforeEach(() => { vi.stubEnv("CI", "true"); });
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });

// Correct
beforeEach(() => { mocks = createMocks({ env: { CI: "true" } }); });
```

### HIGH: Running vitest directly

Always use `pnpm run test`. The `bsh test` wrapper configures vitest correctly.

```sh
# Wrong
pnpm exec vitest run
npx vitest
vitest run

# Correct
pnpm run test
pnpm run test -- src/commands/build.test.ts
```

## Cross-References

See also: **lint/SKILL.md** — Tests must follow the same coding conventions (no `node:path`, consistent type imports, named exports, etc.).
