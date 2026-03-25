---
name: test
description: "Use when running tests, writing new tests, or debugging test failures."
---

# Test

Runs the test suite using vitest in non-watch mode.

## Usage

```sh
pnpm run test
```

## Test File Conventions

- **Colocate tests with source** — next to the code they test, never in `__tests__/` or `test/`
- **`.test.ts`** suffix for runtime tests
- **`.test-d.ts`** suffix for type-level tests (compile-time assertions only)

```
src/
  framework/
    schema.ts
    schema.test.ts
    params.ts
    params.test-d.ts
```

## How It Works

`pnpm run test` runs `bsh test` which calls `vitest run` (single run, no watch).

## Filtering

Pass arguments through to vitest:

```sh
pnpm run test -- src/commands/build.test.ts   # Run specific test file
pnpm run test -- --reporter=verbose            # Change reporter
```

## Test Utilities

`@bomb.sh/tools/test-utils` exports `createFixture` for filesystem-based tests.

```ts
import { createFixture } from "@bomb.sh/tools/test-utils";

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
```

### Fixture API

- `fixture.root` — fixture root as a `file://` URL
- `fixture.resolve(...segments)` — resolve a relative path within the fixture
- `fixture.text(file)` — read file as string
- `fixture.json(file)` — read and parse JSON file
- `fixture.write(file, content)` — write a file
- `fixture.isFile(file)` / `fixture.isDirectory(dir)` — check existence
- `fixture.list(dir)` — list directory contents
- `fixture.cleanup()` — delete fixture (also runs automatically via `onTestFinished`)

All `hfs` methods are available, scoped to the fixture root.

### Fixtures Are Always Inline

Never extract fixture trees into shared variables, helper files, or beforeEach blocks. Each test should declare its own fixture inline so the test is self-contained and readable.

### File Tree Values

| Type | Behavior |
|------|----------|
| `string` | Written as-is |
| `object` / `array` | Auto-serialized as JSON for `.json` keys |
| `Buffer` | Written as binary |
| Nested object (no `.` in key) | Creates a subdirectory |
| `(ctx) => ...` | Dynamic — receives `importMeta` and `symlink` helpers |
