---
name: init
description: "Use when creating a new Bombshell project or package from the template."
---

# Init

Scaffolds a new Bombshell project from the `bombshell-dev/template` GitHub template.

## Usage

```sh
pnpm run init
pnpm run init -- my-project
```

## How It Works

`pnpm run init` runs `bsh init` which:
1. Clones `gh:bombshell-dev/template` via giget
2. Replaces `$name` placeholder in `package.json` and `README.md`
3. Outputs to `.temp/` directory

## Arguments

- First positional arg: project name (defaults to current directory name)
