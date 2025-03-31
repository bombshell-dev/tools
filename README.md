# `@bomb.sh/tools`

This package is an internal CLI intended to standardize tooling across all Bombshell projects. It helps us dogfood our own libraries, but it also makes it easier to keep our shared dependencies in sync.

If you'd like to use this package for your own projects, please consider forking. We are not accepting issues on this repo.

- `init` command for scaffolding new projects, which clones [our `template` repo](https://github.com/bombshell-dev/template)
- `bsh dev` command, using `node --experimental-strip-types --watch-path=./src/`
- `bsh build` command, using [`esbuild`](https://esbuild.github.io/)
- `bsh test` command, unfinished
- `bsh lint` and `bsh format` commands, using [`@biomejs/biome`](https://biomejs.dev/)
- shared `tsconfig.json` file
