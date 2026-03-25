---
name: format
description: "Use when formatting source files or checking code style."
---

# Format

Formats source files using oxfmt with the project's configuration.

## Usage

```sh
pnpm run format
```

## How It Works

`pnpm run format` runs `bsh format` which calls oxfmt with:
- **Config:** `oxfmtrc.json` from `@bomb.sh/tools`
- **Default target:** `./src`

## Custom Targets

```sh
pnpm run format -- ./path/to/file.ts
```

Additional arguments are passed through to oxfmt.
