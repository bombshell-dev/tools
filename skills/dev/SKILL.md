---
name: dev
description: >
  Watch mode development using Node --experimental-transform-types. No transpiler
  needed. Watches ./src/, restarts on changes. Custom entry files supported.
  Experimental command — may change. Use when running TypeScript in dev mode.
metadata:
  type: core
  library: '@bomb.sh/tools'
  library_version: '0.2.8'
  requires:
    - lifecycle
  sources:
    - 'bombshell-dev/tools:src/commands/dev.ts'
---

# Dev

Runs a TypeScript file with native Node TypeScript support and watches for changes.

## Setup

```sh
pnpm run dev
```

## How It Works

`pnpm run dev` runs `bsh dev` which shells out to:

```
node --experimental-transform-types --no-warnings --watch-path=./src/ <file>
```

- **Default file:** `./src/index.ts`
- **Watch path:** `./src/` — restarts on any change in the source directory
- **No transpiler needed** — Node handles TypeScript natively via `--experimental-transform-types`

## Custom Entry

```sh
pnpm run dev -- ./src/other.ts
```

Additional arguments after the file path are passed through to Node.

## Note

This is an experimental command that relies on Node's `--experimental-transform-types` flag. Most Bombshell packages use a TDD loop (`pnpm run test`) as their primary development workflow rather than the dev server. The dev command is useful for running scripts or servers during development, not as the main iteration cycle.

> **Tension:** Dev command stability vs experimental Node features. The underlying `--experimental-transform-types` flag may change behavior between Node versions. If you hit issues, fall back to the test-driven workflow.

## Common Mistakes

### CRITICAL: Using tsx or ts-node

Node handles TypeScript natively. External transpilers are unnecessary and add complexity.

```sh
# Wrong
npx tsx src/index.ts
npx tsx watch src/index.ts
npx ts-node src/index.ts
node -r ts-node/register src/index.ts
```

```sh
# Correct
pnpm run dev
```

### HIGH: Installing TypeScript transpilers as dependencies

These packages are not needed in Bombshell projects.

```json
// Wrong — package.json
{
  "devDependencies": {
    "tsx": "^4.0.0",
    "ts-node": "^10.0.0",
    "esbuild-register": "^3.0.0"
  }
}
```

```json
// Correct — no transpiler dependencies needed
{
  "devDependencies": {
    "@bomb.sh/tools": "^0.2.8"
  }
}
```

## See Also

- `build/SKILL.md` — Both handle TS compilation in different modes
