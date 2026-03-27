---
name: lint
description: >
  Multi-tool linting pipeline: oxlint, publint, knip, tsgo run in parallel via
  pnpm run lint. Covers Bombshell conventions: URL over node:path, max 2 params
  with options bag, named exports only, import type, prefer node builtins, no
  console.log, no generic Error. Use when checking code quality or understanding
  lint violations.
metadata:
  type: core
  library: '@bomb.sh/tools'
  library_version: '0.3.1'
  requires:
    - lifecycle
  sources:
    - 'bombshell-dev/tools:skills/lint/SKILL.md'
    - 'bombshell-dev/tools:src/commands/lint.ts'
    - 'bombshell-dev/tools:oxlintrc.json'
---

# Lint

Multi-tool linting pipeline. All four tools run in parallel with unified output.

## Setup

```sh
pnpm run lint              # Report violations
pnpm run lint -- --fix     # Auto-fix (oxlint only), then report remaining
pnpm run lint -- src/foo.ts  # Target specific files (default: ./src)
```

Do not run oxlint, publint, knip, or tsgo directly. Always use `pnpm run lint`.

See [lifecycle/SKILL.md](../lifecycle/SKILL.md) for where lint fits in the development workflow (step 5: after tests pass, before format).

## How It Works

`pnpm run lint` runs `bsh lint`, which executes four tools via `Promise.allSettled`:

| Tool | What It Checks | Fix Support |
|------|---------------|-------------|
| **oxlint** | JS/TS linting via Rust-based engine with Bombshell config | Yes (`--fix`) |
| **publint** | `package.json` exports, types, and field correctness (strict mode) | No |
| **knip** | Unused dependencies, devDependencies, exports, types, files | No |
| **tsgo** | TypeScript type errors (`--noEmit`, native Go compiler) | No |

Results merge into a single report grouped by file. Exit code 1 if any errors exist.

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

Functions must have at most 2 parameters. Use an options object for anything beyond that.

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

All three are enforced (as warnings) on exported functions:

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

- **Prototyping speed vs lint strictness**: During early prototyping (see [lifecycle](../lifecycle/SKILL.md)), you may want to move fast. The lint rules still apply -- write correct code from the start rather than fixing lint after the fact.
- **Opinionated defaults vs explicit config**: The lint config is intentionally strict and not configurable per-project. If a rule is wrong, change it in `oxlintrc.json` upstream.

## Reference

See [references/lint-rules.md](references/lint-rules.md) for the complete rule table covering all oxlint rules, custom plugin rules, and tool configurations.
