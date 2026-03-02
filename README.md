# `@bomb.sh/tools`

This package is an internal CLI intended to standardize tooling across all Bombshell projects. It helps us dogfood our own libraries, but it also makes it easier to keep our shared dependencies in sync.

If you'd like to use this package for your own projects, please consider forking. We are not accepting issues on this repo.

- `init` command for scaffolding new projects, which clones [our `template` repo](https://github.com/bombshell-dev/template)
- `bsh dev` command, using `node --experimental-transform-types --watch-path=./src/`
- `bsh build` command, using [`tsdown`](https://tsdown.dev/) (ESM, unbundled)
- `bsh test` command, using [`vitest`](https://vitest.dev/)
- `bsh format` command, using [`oxfmt`](https://oxc.rs/docs/guide/usage/formatter)
- `bsh lint` command, using [`oxlint`](https://oxc.rs/docs/guide/usage/linter) and [`publint`](https://publint.dev/)
- shared `tsconfig.json` file
