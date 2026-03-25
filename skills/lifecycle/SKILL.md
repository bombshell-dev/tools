---
description: "Bombshell project lifecycle — how to build, test, lint, format, and run dev tasks. Auto-invoke when working in any project that depends on @bomb.sh/tools."
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

## Do Not

- Run `npx tsx`, `npx ts-node`, or `node -r ts-node/register`
- Run `npx tsc` or `tsgo` directly — `pnpm run lint` includes type checking
- Run `npx vitest` directly — use `pnpm run test`
- Run `npx oxlint` or `npx oxfmt` directly — use `pnpm run lint` / `pnpm run format`
- Use `require()` or any CommonJS patterns
- Install `tsx`, `ts-node`, or `esbuild-register`
- Use `npm`, `yarn`, or `bun` for anything
