---
name: dev
description: "Use when running a TypeScript file in watch mode during development."
---

# Dev

Runs a file with native Node TypeScript support and watches for changes.

## Usage

```sh
pnpm run dev
```

## How It Works

`pnpm run dev` runs `bsh dev` which shells out to:

```
node --experimental-transform-types --no-warnings --watch-path=./src/ <file>
```

- **Default file:** `./src/index.ts`
- **Watch path:** `./src/` — restarts on any change in the source directory
- **No transpiler needed** — Node handles TypeScript natively

## Custom Entry

```sh
pnpm run dev -- ./src/other.ts
```

Additional arguments after the file path are passed through to Node.
