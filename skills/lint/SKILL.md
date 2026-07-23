---
name: lint
description: >
  Multi-tool linting pipeline: oxlint, knip, and tsgo run in parallel via
  pnpm run lint (publint gates pnpm run build instead). Covers Bombshell
  conventions: URL over node:path, max 2 params with options bag, named
  exports only, import type, prefer node builtins, no console.log, no
  generic Error. Use when checking code quality or understanding lint
  violations.
metadata:
  type: core
  library: '@bomb.sh/tools'
  library_version: '0.6.0'
  requires:
    - lifecycle
  sources:
    - 'bombshell-dev/tools:skills/lint/SKILL.md'
    - 'bombshell-dev/tools:src/commands/lint.ts'
    - 'bombshell-dev/tools:oxlintrc.json'
---

# Lint

Multi-tool linting pipeline. oxlint, knip, and tsgo run in parallel with unified output.

## Setup

```sh
pnpm run lint                      # Report errors (warnings collapsed to counts)
pnpm run lint -- --warnings        # Show warnings in full
pnpm run lint -- --strict          # Include knip dead-code checks (pre-commit gate)
pnpm run lint -- --fix             # Auto-fix (oxlint only), then report remaining
pnpm run lint -- src/foo.ts        # Target specific files (default: whole project)
pnpm -s run lint -- --format json  # Machine-readable report for agents/CI
```

Do not run oxlint, knip, or tsgo directly. Always use `pnpm run lint`.
(`--format json` needs `pnpm -s` to keep pnpm's banner out of stdout.)

See [lifecycle/SKILL.md](../lifecycle/SKILL.md) for where lint fits in the development workflow (step 3: after tests pass, before format). Run `--strict` at PR handoff, not during the TDD loop.

## How It Works

`pnpm run lint` runs `bsh lint`, which executes three tools via `Promise.allSettled`:

| Tool | What It Checks | Fix Support |
|------|---------------|-------------|
| **oxlint** | JS/TS linting via Rust-based engine with Bombshell config | Yes (`--fix`) |
| **knip** | Unused dependencies/devDependencies (always); unused exports, types, files (`--strict` only) | No |
| **tsgo** | TypeScript type errors (`--noEmit`, project mode) | No |

Results merge into a single report grouped by file. **Errors print in full;
warnings collapse to a per-rule count** (they never affect the exit code —
pass `--warnings` to expand them). Exit code 1 if any errors exist.

publint is deliberately not part of lint: its file-existence checks need
`dist/`, so it runs as a publish gate in `pnpm run build` (see
[build/SKILL.md](../build/SKILL.md)) and standalone via `pnpm run publint`.

## Remedies

The sanctioned fix for the most common violations. Do not improvise
alternatives (e.g. sprinkling disable comments).

| Violation | Fix |
|-----------|-----|
| `tsc/TS2688` — Cannot find type definition file for 'node' | `pnpm add -D @types/node` |
| `tsc/TS2591` — Cannot find name 'process'/'Buffer' | `pnpm add -D @types/node` |
| `oxlint/eslint(no-restricted-imports)` | Use the `URL` API; `fileURLToPath()` only at third-party boundaries |
| `oxlint/eslint(max-params)` / `bombshell-dev(max-params)` | Options bag with a typed interface. If conforming to a platform interface, say so with `override`/`implements` — the rule exempts those |
| `oxlint/import(no-default-export)` | Use a named export |
| `oxlint/bombshell-dev(no-generic-error)` | Define a project error class with a `code`; throw that |
| `oxlint/bombshell-dev(exported-function-async)` | Only fires on public entry files: make it `async`, or move the export out of the public surface |
| `oxlint/bombshell-dev(require-export-jsdoc)` | Only fires on public entry files: add a one-line `/** ... */` |
| `knip/unused-dependency` | Remove it from `package.json` |
| `knip/unused-export` (`--strict`) | Un-export it, or delete it if nothing consumes it |

Inline `// oxlint-disable` comments are a last resort for genuinely
exceptional cases, never a workflow. If a rule is wrong for your project
shape, raise it — the fix belongs upstream in `oxlintrc.json`.

## Core Patterns

These are the Bombshell coding conventions enforced by oxlint. Write code that follows these from the start.

### URL over `node:path`

All `node:path` and `path` imports are banned. Use the `URL` API for path manipulation. Use `fileURLToPath()` only at boundaries where a third-party API requires a string path.

```ts
// Correct
const config = new URL("./config.json", import.meta.url);
const child = new URL("sub/dir/", parentUrl);

// Correct — boundary where string path is required
import { fileURLToPath } from "node:url";
const configPath = fileURLToPath(new URL("./config.json", import.meta.url));
await thirdPartyLib(configPath);
```

### Options bag for >2 parameters

Functions we author must have at most 2 parameters. Use an options object for anything beyond that.

Signatures conforming to an API you don't control are exempt — `override`
methods, members of classes that `extends` or `implements`, and inline
callbacks. If a platform interface forces more parameters on you, express the
conformance (`override`, `implements`) and the rule stays silent.

```ts
// Correct
interface FormatOptions {
  indent: number;
  lineWidth: number;
  quotes: "single" | "double";
}
export async function format(input: string, options: FormatOptions): Promise<string> {
  // ...
}

// Correct — 2 params is fine
export async function resolve(specifier: string, base: URL): Promise<URL> {
  // ...
}
```

### Named exports only

Default exports are banned. Every export must be named.

```ts
// Correct
export async function createApp(): Promise<App> { /* ... */ }
export const VERSION = "1.0.0";

// Wrong
export default function createApp() { /* ... */ }
```

### `import type` for type-only imports

Separate type imports from value imports.

```ts
// Correct
import type { Config } from "./config.ts";
import { loadConfig } from "./config.ts";

// Wrong
import { Config, loadConfig } from "./config.ts";
```

### `node:` protocol for builtins

Always use the `node:` prefix when importing Node.js built-in modules.

```ts
// Correct
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

// Wrong
import { readFile } from "fs/promises";
```

### Prefer Node 22+ builtins over dependencies

Node 22 ships builtins that replace common npm packages. Use them.

| Instead of | Use |
|-----------|-----|
| `glob` / `fast-glob` | `node:fs` with `{ recursive: true }` or `fs.glob` |
| `dotenv` | `--env-file` flag or `node:process` env loading |
| `node-fetch` | Global `fetch` |
| `chalk` / `kleur` | `node:util` `styleText()` |
| `minimatch` | `node:path` `matchesGlob()` — but remember, use URL-based alternatives where possible |

### `const` over `let`, no `var`

Use `const` by default. Use `let` only when reassignment is necessary. `var` is banned.

### Exported functions: `async`, explicit return types, JSDoc

All three are enforced (as warnings) on exported functions — but `async` and
JSDoc only apply to the **public API surface**: files consumers can import,
derived from `package.json` `exports`/`bin` (mapping `dist/` paths back to
`src/`). Internal modules are exempt. Packages with no publish surface (apps,
examples) are exempt entirely.

```ts
// Correct
/** Resolves the configuration from the given root. */
export async function resolveConfig(root: URL): Promise<Config> {
  // ...
}
```

## Common Mistakes

These are the ranked failure modes. Each shows the wrong pattern and the fix.

### 1. Using `node:path` instead of URL (CRITICAL)

```ts
// Wrong
import { join, resolve } from "node:path";
const config = join(__dirname, "config.json");
const abs = resolve("./src");

// Correct
const config = new URL("./config.json", import.meta.url);
const abs = new URL("./src/", import.meta.url);
```

### 2. Functions with more than 2 parameters (HIGH)

```ts
// Wrong
export async function createServer(port: number, host: string, ssl: boolean): Promise<Server> {
  // ...
}

// Correct
interface ServerOptions {
  port: number;
  host: string;
  ssl: boolean;
}
export async function createServer(options: ServerOptions): Promise<Server> {
  // ...
}
```

### 3. Using `console.log` (MEDIUM)

```ts
// Wrong
console.log("Server started on port", port);

// Correct
console.info("Server started on port", port);
```

Use `console.info` for informational output, `console.warn` for warnings, `console.error` for errors, `console.debug` for debug-level output.

### 4. Using default exports (HIGH)

```ts
// Wrong
export default class Router { /* ... */ }

// Correct
export class Router { /* ... */ }
```

### 5. Not using `import type` for type-only imports (MEDIUM)

```ts
// Wrong
import { SomeInterface } from "./types.ts";

// Correct
import type { SomeInterface } from "./types.ts";
```

### 6. Over-commenting obvious code (MEDIUM)

Agents frequently add redundant comments. Do not explain what code does when the code is self-explanatory.

```ts
// Wrong
// Create a new URL for the config file
const config = new URL("./config.json", import.meta.url);
// Read the file contents
const contents = await readFile(config, "utf-8");

// Correct
const config = new URL("./config.json", import.meta.url);
const contents = await readFile(config, "utf-8");
```

Comments should explain _why_, not _what_. Use JSDoc on exported APIs.

### 7. Not using bleeding-edge Node builtins (HIGH)

```ts
// Wrong
import glob from "fast-glob";
const files = await glob("src/**/*.ts");

// Correct
import { glob } from "node:fs/promises";
const files = await Array.fromAsync(glob("src/**/*.ts"));
```

### 8. Using generic `Error` (HIGH)

```ts
// Wrong
throw new Error("Config file not found");
throw new TypeError("Expected a string");

// Correct — define project-specific error classes
class ConfigError extends Error {
  code: string;
  constructor(message: string, code: string) {
    super(message);
    this.code = code;
  }
}
throw new ConfigError("Config file not found", "CONFIG_NOT_FOUND");
```

Builtin error constructors (`Error`, `TypeError`, `RangeError`, `ReferenceError`, `SyntaxError`, `URIError`, `EvalError`, `AggregateError`) are all banned. Use structured error classes with codes and metadata.

## Tensions

- **Prototyping speed vs lint strictness**: During early prototyping (see [lifecycle](../lifecycle/SKILL.md)), you may want to move fast. The lint rules still apply -- write correct code from the start rather than fixing lint after the fact. Dead-code checks (knip unused exports/types/files) are deferred to `--strict` at PR handoff precisely so they don't fire mid-implementation.
- **Opinionated defaults vs explicit config**: The lint config is intentionally strict and not configurable per-project. If a rule is wrong, change it in `oxlintrc.json` upstream.

## Reference

See [references/lint-rules.md](references/lint-rules.md) for the complete rule table covering all oxlint rules, custom plugin rules, and tool configurations.
