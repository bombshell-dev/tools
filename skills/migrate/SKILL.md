---
name: migrate
description: >
  Migrate existing project to bsh toolchain. Remove prettier, biome, eslint, tsup,
  unbuild, rollup configs and dependencies. Replace scripts with bsh equivalents.
  Consolidate to single @bomb.sh/tools devDependency. Migration order: check existing
  tools, add unimplemented commands, replace 1:1 commands, evaluate remaining, migrate
  one by one. Use when onboarding a project to the Bombshell ecosystem.
type: lifecycle
library: '@bomb.sh/tools'
library_version: '0.2.8'
requires:
  - lifecycle
sources:
  - 'bombshell-dev/tools:skills/lifecycle/SKILL.md'
---

# @bomb.sh/tools — Migration Checklist

Run through each section when migrating a project to the bsh toolchain.

## Step 1: Inventory Existing Tools

Check what the project currently uses:
- Build: tsup, unbuild, rollup, custom scripts, raw tsc?
- Lint: eslint, biome, tslint?
- Format: prettier, biome?
- Test: vitest, jest, mocha?
- Type check: tsc directly?

## Step 2: Add @bomb.sh/tools

```sh
pnpm add -D @bomb.sh/tools
```

## Step 3: Replace 1:1 Commands

For each tool that maps directly:

| Old Tool | New Command | Notes |
|----------|------------|-------|
| vitest | pnpm run test | Likely already compatible |
| prettier / biome format | pnpm run format | oxfmt replaces both |
| eslint / biome lint | pnpm run lint | oxlint + publint + knip + tsgo |
| tsup / unbuild / rollup | pnpm run build | tsdown with ESM defaults |
| tsc --noEmit | pnpm run lint | Type checking included in lint |

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

## Step 6: Remove Old Dependencies

Remove from devDependencies:
- prettier, eslint, biome, @biomejs/biome
- tsup, unbuild, rollup and rollup plugins
- eslint plugins and configs
- prettier plugins
- Any TypeScript runners: tsx, ts-node, esbuild-register

## Step 7: Move Tests to Colocated Pattern

If tests are in __tests__/ or test/ directories, move them next to source:
- __tests__/schema.test.ts → src/schema.test.ts (next to src/schema.ts)
- Use .test.ts for runtime, .test-d.ts for type-level

## Step 8: Verify

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

3. **MEDIUM: Not moving tests to colocated pattern**
   - Wrong: Tests remain in __tests__/ directory after migration
   - Correct: Tests colocated next to source files as .test.ts
   - Bombshell convention requires colocated tests for readability.

## Cross-references

- See also: lifecycle/SKILL.md — After migration, adopt the bsh lifecycle workflow
- See also: lint/SKILL.md — Understanding lint rules helps during migration

Source: maintainer interview
