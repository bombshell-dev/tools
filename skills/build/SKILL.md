---
name: build
description: "Use when compiling TypeScript to ESM, generating declaration files, or preparing a package for publish."
---

# Build

Builds TypeScript to ESM using tsdown with opinionated defaults.

## Usage

```sh
pnpm run build
```

## How It Works

`pnpm run build` runs `bsh build` which calls tsdown with:
- **Format:** ESM only
- **Sourcemaps:** enabled
- **Clean:** removes dist/ before building
- **Unbundled** by default (each source file produces one output file)
- **Entry:** defaults to `src/**/*.ts`

## Flags

Pass flags after `--` in pnpm:

```sh
pnpm run build -- --dts        # Generate .d.mts declaration files
pnpm run build -- --bundle     # Bundle into single output (disables unbundled mode)
pnpm run build -- --minify     # Minify output
pnpm run build -- src/index.ts # Specify custom entry points
```

Flags can be combined: `pnpm run build -- --dts --minify`
