# @bomb.sh/tools

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
