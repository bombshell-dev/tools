---
name: init
description: >
  Scaffold new Bombshell project from bombshell-dev/template via giget. Replaces
  $name placeholder in package.json and README.md. Outputs to .temp/. Use when
  creating a new package in the Bombshell ecosystem.
metadata:
  type: core
  library: '@bomb.sh/tools'
  library_version: '0.2.8'
  sources:
    - 'bombshell-dev/tools:src/commands/init.ts'
---

# Init

Scaffolds a new Bombshell project from the `bombshell-dev/template` GitHub template.

## Setup

```sh
pnpm run init -- my-project
```

## How It Works

`pnpm run init` runs `bsh init` which:

1. Clones `gh:bombshell-dev/template` via giget
2. Replaces `$name` placeholder in `package.json` and `README.md` with the project name
3. Outputs to `.temp/` directory

### Arguments

- First positional arg: project name
- If no name is provided, defaults to the parent directory name

```sh
pnpm run init -- my-project    # Creates .temp/my-project
pnpm run init                   # Uses parent directory name
```

## Common Mistakes

### MEDIUM: Manually scaffolding project structure

The template includes all Bombshell conventions (package.json scripts, tsconfig, etc.). Don't create these by hand.

```sh
# Wrong
mkdir my-project
cd my-project
npm init -y
# ... manually adding scripts, configs, etc.
```

```sh
# Correct
pnpm run init -- my-project
```

## See Also

- `lifecycle/SKILL.md` — After init, enter the lifecycle workflow
