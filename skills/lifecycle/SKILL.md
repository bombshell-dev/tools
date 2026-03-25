---
name: lifecycle
description: "Use when working in any project that depends on @bomb.sh/tools — covers how to run build, test, lint, format, dev, and init tasks."
---

# Bombshell Project Lifecycle

This project uses `@bomb.sh/tools` (`bsh`) as its dev toolchain. All dev tasks are run through `package.json` scripts.

## Rules

1. **Always use `pnpm run <script>`** to run project tasks
2. **Never use `npx`, `npm run`, `pnpm dlx`, `yarn`, `bun`, or `tsx`**
3. **Never run underlying tools directly** — no `pnpm exec tsdown`, `pnpm exec vitest`, `pnpm exec oxlint`, `pnpm exec knip`
4. **Always ESM** — no CommonJS, no `require()`, no `ts-node`, no `tsx`
5. **Node handles TypeScript natively** via `--experimental-transform-types`
6. **pnpm is the only package manager** — never use `npm`, `yarn`, or `bun`

## Monorepo vs Single Package

Detect project structure before running commands.

**Single package** (no `pnpm-workspace.yaml`):
- All scripts run from package root: `pnpm run <script>`

**Monorepo** (has `pnpm-workspace.yaml`):
- Conventional layout: `packages/` for libraries, `examples/` for demos
- Root scripts may differ — always check `package.json` before running
- To target one package: `pnpm --filter <pkg> run <script>`
- Common pattern: `build`/`test` recursive (`pnpm -r`), `format`/`lint` direct (`bsh`)

## Available Scripts

All scripts are defined in `package.json` and proxy to `bsh <command>`:

| Script            | What It Does                                      |
| ----------------- | ------------------------------------------------- |
| `pnpm run build`  | Build with tsdown (ESM, sourcemaps, clean dist)   |
| `pnpm run dev`    | Watch mode with native Node TypeScript transforms |
| `pnpm run format` | Format with oxfmt                                 |
| `pnpm run lint`   | Parallel lint: oxlint + publint + knip + tsc      |
| `pnpm run test`   | Run tests with vitest                             |
| `pnpm run init`   | Scaffold new Bombshell project from template      |

## Development Workflow

Follow this order when making changes. Write tests first, verify before claiming success.

1. **Test first** — write or update `.test.ts` files before implementation
2. **Run tests** (`pnpm run test`) — confirm the new test fails (RED)
3. **Implement** — write the minimum code to pass
4. **Run tests** (`pnpm run test`) — confirm tests pass (GREEN)
5. **Lint** (`pnpm run lint`) — fix type errors, unused exports, style
6. **Format** (`pnpm run format`) — normalize code style
7. **Build** (`pnpm run build`) — verify the package compiles
8. **Final test** (`pnpm run test`) — end-to-end confirmation

Never skip straight to implementation. Never claim "tests pass" without running them.

## Do Not

- Run `npx tsx`, `npx ts-node`, or `node -r ts-node/register`
- Run `npx tsc` or `tsgo` directly — `pnpm run lint` includes type checking
- Run `npx vitest` directly — use `pnpm run test`
- Run `npx oxlint` or `npx oxfmt` directly — use `pnpm run lint` / `pnpm run format`
- Use `require()` or any CommonJS patterns
- Install `tsx`, `ts-node`, or `esbuild-register`
- Use `npm`, `yarn`, or `bun` for anything
