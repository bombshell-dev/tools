---
name: lifecycle
description: >
  TDD-driven development workflow for Bombshell projects using bsh CLI. Covers
  pnpm run as only entry point, command ordering (test→implement→lint→format→build→test),
  monorepo vs single-package detection with pnpm --filter, human-owned PRs.
  Use when starting work on any project that depends on @bomb.sh/tools.
metadata:
  type: lifecycle
  library: '@bomb.sh/tools'
  library_version: '0.3.1'
  sources:
    - 'bombshell-dev/tools:skills/lifecycle/SKILL.md'
    - 'bombshell-dev/tools:src/bin.ts'
---

# Development Lifecycle

TDD-driven workflow for all Bombshell projects. Follow the checklist below for every change.

## Available Scripts

All scripts proxy to `bsh <command>` via `package.json`. Never bypass them.

| Command              | Runs         | Purpose                                    |
| -------------------- | ------------ | ------------------------------------------ |
| `pnpm run build`     | `bsh build`  | Build with tsdown (ESM, sourcemaps, clean) |
| `pnpm run dev`       | `bsh dev`    | Watch mode with native Node TS transforms  |
| `pnpm run format`    | `bsh format` | Format with oxfmt                          |
| `pnpm run lint`      | `bsh lint`   | Parallel: oxlint + publint + knip + tsgo   |
| `pnpm run test`      | `bsh test`   | Run tests with vitest (single run)         |
| `pnpm run init`      | `bsh init`   | Scaffold new project from template         |

## Monorepo vs Single Package

Detect the project structure before running any commands.

**Single package** — no `pnpm-workspace.yaml` at root:

```sh
pnpm run test
pnpm run lint
```

**Monorepo** — has `pnpm-workspace.yaml`:

```sh
# Target a specific package
pnpm --filter <package-name> run test
pnpm --filter <package-name> run build

# Run recursively across all packages
pnpm -r run build
pnpm -r run test

# Root-level scripts (lint/format typically run from root)
pnpm run lint
pnpm run format
```

Check `pnpm-workspace.yaml` for the workspace layout. Conventional structure:
- `packages/` for libraries
- `examples/` for demos

Always read the root `package.json` before assuming which scripts exist.

## Workflow Checklist

Follow this order for every change. Do not skip steps, do not reorder.

### 1. Write Tests First (RED)

- [ ] Create or update `.test.ts` files **before** writing implementation
- [ ] Colocate tests next to source — never in `__tests__/` or `test/`
- [ ] Run tests and confirm new tests **fail**:

```sh
pnpm run test
```

### 2. Implement (GREEN)

- [ ] Write the minimum code to make tests pass
- [ ] Run tests and confirm they **pass**:

```sh
pnpm run test
```

### 3. Lint

- [ ] Run the full lint pipeline:

```sh
pnpm run lint
```

- [ ] Fix all errors. Use `--fix` for auto-fixable issues:

```sh
pnpm run lint -- --fix
```

### 4. Format

- [ ] Normalize code style:

```sh
pnpm run format
```

### 5. Build

- [ ] Verify the package compiles:

```sh
pnpm run build
```

### 6. Final Test

- [ ] End-to-end confirmation after build:

```sh
pnpm run test
```

### 7. PR Handoff

- [ ] Present a summary of changes to the human
- [ ] **Human creates the PR** — agents do not create or merge PRs autonomously

## Do Not

These are hard rules. Violating any of them is a failed task.

| Forbidden                                    | Use Instead                         |
| -------------------------------------------- | ----------------------------------- |
| `npx <anything>`                             | `pnpm run <script>`                 |
| `pnpm dlx` for local tools                   | `pnpm run <script>`                 |
| `npm run`, `yarn`, `bun`                     | `pnpm run <script>`                 |
| `tsx`, `ts-node`, `esbuild-register`         | Native Node TS (`--experimental-transform-types`) |
| `npx vitest` / `pnpm exec vitest`           | `pnpm run test`                     |
| `npx oxlint` / `pnpm exec oxlint`           | `pnpm run lint`                     |
| `npx oxfmt` / `pnpm exec oxfmt`             | `pnpm run format`                   |
| `npx tsdown` / `pnpm exec tsdown`           | `pnpm run build`                    |
| `npx knip` / `pnpm exec knip`               | `pnpm run lint`                     |
| `npx tsc` / `tsgo` directly                 | `pnpm run lint` (includes type checking) |
| `require()`, `module.exports`               | ESM `import` / `export`             |
| Implement before writing tests               | Write tests first (RED→GREEN)       |
| Claim "tests pass" without running them      | Always run `pnpm run test`          |
| Create PRs autonomously                      | Present summary, human authors PR   |

## Common Mistakes

### CRITICAL: Using npx instead of pnpm run

Agents default to `npx`. Bombshell projects always use `pnpm run` for local scripts. If you need a one-off binary not in the project, use `pnpm dlx` — but local tools must go through `pnpm run`.

### CRITICAL: Running underlying tools directly

Never call `tsdown`, `vitest`, `oxlint`, `knip`, `oxfmt`, or `tsgo` directly. The `bsh` wrapper configures flags, paths, and parallelism. Bypassing it produces wrong behavior.

### CRITICAL: Using npm, yarn, or bun

`pnpm` is the only package manager. Do not install, run, or execute with any other package manager.

### HIGH: Skipping TDD and implementing first

Always write or update tests before implementation. The RED→GREEN cycle is not optional. If you find yourself writing code without a failing test, stop and write the test first.

### HIGH: Running tsc directly for type checking

`pnpm run lint` runs `tsgo --noEmit` as part of its parallel pipeline. Do not run `tsc` or `tsgo` separately — the lint command handles it.

### HIGH: Full autopilot PR creation

Agents assist with code changes. Humans own the code and author PRs. Present your changes and let the human decide when and how to submit.

### CRITICAL: Using node:path instead of URL

`node:path` is banned by oxlint config. Use `URL` for all path manipulation:

```ts
// Correct
const file = new URL("./config.json", import.meta.url);

// Wrong — will fail lint
import { join } from "node:path";
const file = join(__dirname, "config.json");
```

Use `fileURLToPath()` only at boundaries where a third-party API requires a string path.

### HIGH: Functions with more than 2 parameters

Refactor to an options bag. `max-params` is set to 2 and is an error:

```ts
// Correct
function createServer(options: { port: number; host: string; ssl: boolean }): void { }

// Wrong — 3 params, fails lint
function createServer(port: number, host: string, ssl: boolean): void { }
```

### MEDIUM: Over-commenting obvious code

Do not add comments that restate what the code does. Comments should explain **why**, not **what**.

### HIGH: Not using bleeding-edge Node builtins

Prefer Node built-in APIs over third-party dependencies. Check Node docs for newer APIs before reaching for a package.

## Tensions

**Prototyping speed vs lint strictness** — During early prototyping you may want to move fast, but all code that gets committed must pass `pnpm run lint`. Prototype freely, lint before committing. See also: `lint/SKILL.md`.

**Dev command stability vs experimental Node features** — `pnpm run dev` uses `--experimental-transform-types` which is stable enough for development but may have edge cases. If you hit issues, check Node version compatibility.

## Cross-References

- **lint/SKILL.md** — Full lint rules and conventions that this lifecycle enforces
- **test/SKILL.md** — Test file conventions, fixture API, and filtering
