# @bomb.sh/tools

## 0.4.0

### Minor Changes

- 06a1190: Updates `knip` dependency to v6

## 0.3.4

### Patch Changes

- Fixes `vitest-ansi-serializer` resolution issue

## 0.3.3

### Patch Changes

- f9d1c06: Fixes `bsh test` config issue

## 0.3.2

### Patch Changes

- f716864: Fixes a bundling issue with test-utils

## 0.3.1

### Patch Changes

- ffba54e: Ignores colocated `*.test.ts` files in build
- ffba54e: Adds automatic `vitest` config with `vitest-ansi-serializer`

## 0.3.0

### Minor Changes

- df17b88: Adds skills for coding agents. Eight skills cover the full `bsh` toolchain — lifecycle, lint, build, test, format, dev, init, and migration for onboarding an existing project.

  If you use an AI coding agent, run `pnpm add -D @bomb.sh/tools` then have your agent run `pnpm dlx @tanstack/intent@latest install` to load project-specific skills for `@bomb.sh/tools`.

## 0.2.8

### Patch Changes

- Updates `fixture.root` to include trailing slash

## 0.2.7

### Patch Changes

- Removes type-only import from bundle

## 0.2.6

### Patch Changes

- 0eeee28: Adds support for nested object syntax, dynamic file creation, and better fs bindings to createFixture

## 0.2.5

### Patch Changes

- 0945a18: Allows strongly typed `.json` files in fixtures
- 0945a18: Use current test name as a prefix for tmpdir in fixture

## 0.2.4

### Patch Changes

- Distribute with types

## 0.2.3

### Patch Changes

- 9d2c754: Adds `@bomb.sh/tools/test-utils` export with `createFixture()`

## 0.2.2

### Patch Changes

- ccb63b7: Adds `--dts` and `--minify` flags to `build` command

## 0.2.1

### Patch Changes

- 61c3763: Updates `tsdown` entrypoint (defaults to `src`)

## 0.2.0

### Minor Changes

- 5f43969: Implements `lint` command using `oxlint`, `tsgo`, `knip`, and `publint`
- c3f801b: Adds `build` command which uses `tsdown`. Default uses `--unbundle`, but pass `--bundle` to create single files.

## 0.1.0

### Minor Changes

- cf9b4c3: Updates commands to use the oxfmt, oxlint, publint, tsdown, vitest

## 0.0.8

### Patch Changes

- Publishes the changes that were supposed to land in v0.0.7

## 0.0.7

### Patch Changes

- 48d96a9: Fixes a bundling issue with `cloudflare:*` and `bun:*` import specifiers

## 0.0.6

### Patch Changes

- fe016ca: Fixes an issue when a package.json doesn't have any dependencies

## 0.0.5

### Patch Changes

- f1425e7: Fixes issue with import paths

## 0.0.4

### Patch Changes

- f51c30b: Fixes externalized dependency bundling and properly handles rewriting for local `.ts` modules

## 0.0.3

### Patch Changes

- Updates bundling approach to avoid code duplication

## 0.0.2

### Patch Changes

- 4652f97: link to nested local `.bin` files

## 0.0.1

### Patch Changes

- fix exports
