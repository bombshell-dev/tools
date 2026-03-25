---
description: "Run the full lint pipeline (oxlint, publint, knip, tsc). Run with `pnpm run lint`."
---

# Lint

Runs a multi-tool linting pipeline in parallel with unified output.

## Usage

```sh
pnpm run lint
pnpm run lint -- --fix
```

## How It Works

`pnpm run lint` runs `bsh lint` which executes four tools **in parallel**:

| Tool | What It Checks |
|------|---------------|
| **oxlint** | JavaScript/TypeScript linting (fast, Rust-based) |
| **publint** | package.json correctness (exports, types, etc.) |
| **knip** | Unused dependencies, exports, types, and files |
| **tsc** (tsgo) | TypeScript type checking (`--noEmit`) |

Results are merged into a single grouped report with file locations.

## Flags

- `--fix` — Auto-fix what oxlint can fix, then report remaining violations
- Positional args — Target paths (default: `./src`)

## Exit Codes

- **0** — No errors
- **1** — Errors found

## Important

Do not run any of these tools individually. `pnpm run lint` runs them all and gives you a unified view.

## Opinionated Rules

The oxlint config enforces Bombshell conventions. When writing code for this project, follow these rules proactively — don't wait for the linter to catch them.

### Paths: Use File URLs, not `node:path`

`node:path` and `path` imports are **banned**. Use `URL` for all path manipulation:

```ts
// Do this
const file = new URL("./config.json", import.meta.url);
const child = new URL("./sub/", base);

// Not this
import { join } from "node:path";
const file = join(__dirname, "config.json");
```

Use `fileURLToPath()` only at third-party module boundaries that require string paths.

### No CommonJS

`import/no-commonjs` is an error. No `require()`, no `module.exports`, no `exports.foo`.

### Imports

- **No default exports** (`import/no-default-export`) — use named exports
- **Consistent type imports** (`typescript/consistent-type-imports`) — use `import type` for type-only imports
- **Prefer `node:` protocol** (`unicorn/prefer-node-protocol`) — `import { readFile } from "node:fs/promises"`, not `"fs/promises"`

### Functions

- **Max 2 parameters** (`max-params`, error) — if a function needs more than 2 parameters, refactor to an options bag
- **Explicit return types on declarations** (`typescript/explicit-function-return-type`, warn) — expressions are exempt
- **Exported functions should be async** (`bombshell-dev/exported-function-async`, warn)
- **Exported functions need JSDoc** (`bombshell-dev/require-export-jsdoc`, warn)

### General

- **`const` over `let`** (`prefer-const`) — never use `var`
- **No generic errors** (`bombshell-dev/no-generic-error`) — use specific error types
- **No `console.log`** (`no-console`, warn) — use `console.info`, `console.warn`, `console.error`, or `console.debug`
