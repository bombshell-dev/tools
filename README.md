# `@bomb.sh/tools`

This package is an internal CLI intended to standardize tooling across all Bombshell projects. It helps us dogfood our own libraries, but it also makes it easier to keep our shared dependencies in sync.

If you'd like to use this package for your own projects, please consider forking. We are not accepting issues on this repo.

- `bsh init` command for scaffolding new projects, which clones [our `template` repo](https://github.com/bombshell-dev/template)
- `bsh dev` command, using `node --experimental-transform-types --watch-path=./src/`
- `bsh build` command, using [`tsdown`](https://tsdown.dev/) (ESM, unbundled, types by default) with [`publint`](https://publint.dev/) as a publish gate
- `bsh test` command, using [`vitest`](https://vitest.dev/)
- `bsh format` command, using [`oxfmt`](https://oxc.rs/docs/guide/usage/formatter)
- `bsh lint` command, using [`oxlint`](https://oxc.rs/docs/guide/usage/linter), [`knip`](https://knip.dev), [`tsgo`](https://npmx.dev/@typescript/native-preview)
- `bsh publint` command, using [`publint`](https://publint.dev/)
- `bsh sync` command, which links our shared [agent skills](#agent-skills) into your project
- shared `tsconfig.json` file

## Agent Skills

If you use an AI coding agent, run `pnpm bsh sync` to symlink this package's skill files into your project's `skills/` directory. Synced skills are automatically added to your `.gitignore`, and an index of them is maintained in your `AGENTS.md`. Claude Code users: add `@AGENTS.md` to your project's `CLAUDE.md`.
