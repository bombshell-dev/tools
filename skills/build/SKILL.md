---
name: build
description: >
  TypeScript to ESM compilation via tsdown with opinionated defaults. Sourcemaps,
  clean dist/, unbundled output. Flags: --dts, --bundle, --minify. Default entry
  src/**/*.ts. Use when building a package for publish or generating declarations.
metadata:
  type: core
  library: '@bomb.sh/tools'
  library_version: '0.3.1'
  requires:
    - lifecycle
  sources:
    - 'bombshell-dev/tools:src/commands/build.ts'
---

# Build

Builds TypeScript to ESM using tsdown with opinionated defaults.

## Setup

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
- **Config:** explicitly disabled (`config: false`) — tsdown.config.ts is ignored

## Flags

Pass flags after `--` in pnpm:

| Flag | Effect |
|------|--------|
| `--dts` | Generate `.d.mts` declaration files |
| `--bundle` | Bundle into single output (disables unbundled mode) |
| `--minify` | Minify output |
| positional args | Custom entry points (replaces default `src/**/*.ts`) |

```sh
pnpm run build -- --dts
pnpm run build -- --bundle
pnpm run build -- --minify
pnpm run build -- src/index.ts
pnpm run build -- --dts --minify
```

## Common Mistakes

### MEDIUM: Passing unnecessary flags

ESM, sourcemaps, and clean are already defaults. Don't pass them explicitly.

```sh
# Wrong
pnpm run build -- --format esm --sourcemap --clean
```

```sh
# Correct
pnpm run build
```

### HIGH: Running tsdown directly

Always go through the `bsh` wrapper to get correct defaults.

```sh
# Wrong
pnpm exec tsdown src/**/*.ts --format esm
npx tsdown src/**/*.ts
```

```sh
# Correct
pnpm run build
```

### HIGH: CommonJS output configuration

Bombshell is ESM-only. Never configure CJS output.

```sh
# Wrong
pnpm run build -- --format cjs
```

```sh
# Correct — ESM is the only format, no flag needed
pnpm run build
```

## See Also

- `dev/SKILL.md` — Both handle TS compilation in different modes
