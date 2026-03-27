---
name: migrate
description: >
  Migrate existing project to bsh toolchain. Remove prettier, biome, eslint, tsup,
  unbuild, rollup, vitest configs and dependencies. Replace scripts with bsh equivalents.
  Adopt createMocks and createFixture from @bomb.sh/tools/test-utils. Consolidate to
  single @bomb.sh/tools devDependency. Migration order: inventory existing tools, add
  unimplemented commands, replace 1:1 commands, remove configs and deps, adopt test-utils,
  verify. Use when onboarding a project to the Bombshell ecosystem.
metadata:
  type: lifecycle
  library: "@bomb.sh/tools"
  library_version: "0.3.1"
  requires:
    - lifecycle
  sources:
    - "bombshell-dev/tools:skills/lifecycle/SKILL.md"
---

# @bomb.sh/tools — Migration Checklist

Run through each section when migrating a project to the bsh toolchain.

## Step 1: Inventory Existing Tools

Check what the project currently uses:

- Build: tsup, unbuild, rollup, custom scripts, raw tsc?
- Lint: eslint, biome, tslint?
- Format: prettier, biome?
- Test: vitest, jest, mocha, node:test?
- Test config: vitest.config.ts, jest.config.js, custom config?
- Test mocks: manual vi.stubEnv, hand-rolled stream mocks, custom beforeAll/afterAll cleanup?
- Type check: tsc directly?

## Step 2: Add @bomb.sh/tools

```sh
pnpm add -D @bomb.sh/tools
```

## Step 3: Replace 1:1 Commands

For each tool that maps directly:

| Old Tool                         | New Command                                      | Notes                             |
| -------------------------------- | ------------------------------------------------ | --------------------------------- |
| vitest                           | pnpm run test                                    | Likely already compatible         |
| prettier / biome format          | pnpm run format                                  | oxfmt replaces both               |
| eslint / biome lint              | pnpm run lint                                    | oxlint + publint + knip + tsgo    |
| tsup / unbuild / rollup          | pnpm run build                                   | tsdown with ESM defaults          |
| tsc --noEmit                     | pnpm run lint                                    | Type checking included in lint    |
| manual vi.stubEnv / stream mocks | `createMocks()` from `@bomb.sh/tools/test-utils` | Auto-cleanup via `onTestFinished` |

## Step 4: Add Unimplemented Commands

If the project didn't have lint or format before, add them now:

Update package.json scripts:

```json
{
  "scripts": {
    "build": "bsh build",
    "dev": "bsh dev",
    "format": "bsh format",
    "lint": "bsh lint",
    "test": "bsh test"
  }
}
```

## Step 5: Remove Old Config Files

Delete these if present:

- .prettierrc, .prettierrc.json, .prettierrc.yaml, prettier.config.js
- biome.json, biome.jsonc
- .eslintrc, .eslintrc.json, .eslintrc.yaml, eslint.config.js, eslint.config.mjs
- rollup.config.js, rollup.config.mjs
- tsup.config.ts, tsup.config.js
- unbuild.config.ts, build.config.ts
- vitest.config.ts, vitest.config.js, vitest.config.mjs
- jest.config.js, jest.config.ts

## Step 6: Remove Old Dependencies

Remove from devDependencies:

- prettier, eslint, biome, @biomejs/biome
- tsup, unbuild, rollup and rollup plugins
- eslint plugins and configs
- prettier plugins
- vitest, vitest-ansi-serializer, any vitest plugins
- jest, @jest/types, jest transforms and presets
- Any TypeScript runners: tsx, ts-node, esbuild-register

## Step 7: Move Tests to Colocated Pattern

If tests are in **tests**/ or test/ directories, move them next to source:

- **tests**/schema.test.ts → src/schema.test.ts (next to src/schema.ts)
- Use .test.ts for runtime, .test-d.ts for type-level

## Step 8: Adopt Test Utilities

Replace manual mock setups with `createMocks` from `@bomb.sh/tools/test-utils`. It handles env stubbing, stream mocking, and auto-cleanup via `onTestFinished`.

**Environment mocking:**

```ts
// Before: manual setup + cleanup
import { vi, beforeEach, afterEach } from "vitest";

beforeEach(() => {
  vi.stubEnv("CI", "true");
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

// After: createMocks handles it
import { createMocks, type Mocks } from "@bomb.sh/tools/test-utils";

let mocks: Mocks;
beforeEach(() => {
  mocks = createMocks({ env: { CI: "true" } });
});
```

**Stream mocking:**

```ts
import { createMocks, type Mocks } from "@bomb.sh/tools/test-utils";

const mocks = createMocks({
  input: true,                              // MockReadable with defaults
  output: { columns: 120, isTTY: true },    // MockWritable
  env: { NO_COLOR: "1" },
});
// mocks.input — MockReadable (pushValue, close, isRaw, setRawMode)
// mocks.output — MockWritable (buffer, resize, columns, rows)
```

Also migrate any `createFixture` usage to import from `@bomb.sh/tools/test-utils` if currently using a local implementation.

## Step 9: Verify

Run through the full lifecycle to confirm migration:

```sh
pnpm run test      # Tests still pass
pnpm run lint      # No unexpected violations
pnpm run format    # Code formatted correctly
pnpm run build     # Package builds cleanly
pnpm run test      # Final confirmation
```

## Common Mistakes

1. **HIGH: Leaving old tool configs alongside bsh**
   - Wrong: .prettierrc, biome.json still exist alongside @bomb.sh/tools
   - Correct: Remove all old config files — bsh provides all configuration
   - Old configs can shadow or conflict with bsh defaults.

2. **HIGH: Keeping old tool-specific scripts**
   - Wrong: `"lint": "eslint . && tsc --noEmit"`
   - Correct: `"lint": "bsh lint"`
   - Old scripts bypass the unified bsh pipeline.

3. **HIGH: Keeping vitest.config.ts alongside bsh**
   - Wrong: Custom `vitest.config.ts` still exists alongside `@bomb.sh/tools`
   - Correct: Remove it — `bsh test` provides its own config (excludes `dist/`, enables ANSI snapshot serialization)
   - A project-level vitest config shadows the bsh defaults.

4. **MEDIUM: Manual mock cleanup instead of createMocks**
   - Wrong: `beforeAll`/`afterAll` with `vi.stubEnv`/`vi.unstubAllEnvs` scattered across test files
   - Correct: `createMocks({ env: { ... } })` — auto-cleans via `onTestFinished`

5. **MEDIUM: Not moving tests to colocated pattern**
   - Wrong: Tests remain in **tests**/ directory after migration
   - Correct: Tests colocated next to source files as .test.ts
   - Bombshell convention requires colocated tests for readability.

## Cross-references

- See also: lifecycle/SKILL.md — After migration, adopt the bsh lifecycle workflow
- See also: lint/SKILL.md — Understanding lint rules helps during migration

Source: maintainer interview
