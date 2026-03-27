---
name: format
description: >
  Code formatting via oxfmt with project configuration. Tabs, single quotes,
  semicolons always, trailing commas, 100-char line width. Use when formatting
  source files before committing.
metadata:
  type: core
  library: '@bomb.sh/tools'
  library_version: '0.3.1'
  requires:
    - lifecycle
  sources:
    - 'bombshell-dev/tools:src/commands/format.ts'
    - 'bombshell-dev/tools:oxfmtrc.json'
---

# Format

Formats source files using oxfmt with the project's configuration.

## Setup

```sh
pnpm run format
```

## How It Works

`pnpm run format` runs `bsh format` which calls oxfmt with:
- **Config:** `oxfmtrc.json` bundled in `@bomb.sh/tools`
- **Default target:** `./src`
- Additional arguments are passed through to oxfmt

```sh
pnpm run format -- ./path/to/file.ts
```

## Style Rules

| Rule | Value |
|------|-------|
| Indentation | Tabs |
| Quotes | Single quotes |
| Semicolons | Always |
| Trailing commas | Yes |
| Line width | 100 characters |

These are enforced by `oxfmtrc.json`. The config file is resolved from the `@bomb.sh/tools` package, not from the project root.

> **Tension:** Opinionated defaults vs explicit configuration. Trust the defaults — don't pass extra flags to override style rules. The project convention is uniform formatting across all Bombshell packages.

## Common Mistakes

### HIGH: Running prettier or biome format

The project uses oxfmt exclusively. Other formatters will produce different output.

```sh
# Wrong
npx prettier --write src/
npx biome format src/
pnpm exec prettier --write .
```

```sh
# Correct
pnpm run format
```

### MEDIUM: Using spaces instead of tabs

oxfmt enforces tabs. If your editor is configured for spaces, the formatter will rewrite them.

```ts
// Wrong — spaces
function hello() {
    return 'world';
}
```

```ts
// Correct — tabs
function hello() {
	return 'world';
}
```

### MEDIUM: Using double quotes instead of single quotes

oxfmt enforces single quotes. Don't fight the formatter.

```ts
// Wrong
import { readFile } from "node:fs/promises";
const name = "bombshell";
```

```ts
// Correct
import { readFile } from 'node:fs/promises';
const name = 'bombshell';
```
