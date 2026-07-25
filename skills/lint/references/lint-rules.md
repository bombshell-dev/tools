# Lint Rules Reference

Complete rule table for `oxlintrc.json` and custom Bombshell plugin rules.

## oxlint Built-in Rules

| Rule | Severity | Source | Description |
|------|----------|--------|-------------|
| `no-restricted-imports` | error | oxlint | Bans `node:path`, `path`, `node:path/posix`, `node:path/win32` |
| `import/no-commonjs` | error | oxlint/import | No `require()`, `module.exports`, `exports.foo` |
| `import/no-default-export` | error | oxlint/import | All exports must be named |
| `unicorn/prefer-node-protocol` | error | oxlint/unicorn | Require `node:` prefix on Node.js builtins |
| `typescript/consistent-type-imports` | error | oxlint/typescript | Use `import type` for type-only imports |
| `no-console` | warn | oxlint | Bans `console.log`; allows `console.info`, `warn`, `error`, `debug` |
| `prefer-const` | error | oxlint | Use `const` when variable is never reassigned |
| `no-var` | error | oxlint | No `var` declarations |
| `typescript/explicit-function-return-type` | warn | oxlint/typescript | Function declarations need return types (expressions exempt) |
| `node/no-path-concat` | error | oxlint/node | No string concatenation with `__dirname`/`__filename` |

Deliberately disabled category defaults: `unicorn/consistent-function-scoping`, `no-underscore-dangle`.

## Bombshell Custom Plugin Rules

Defined in `rules/plugin.js`, registered as the `bombshell-dev` plugin.

| Rule | Severity | Description |
|------|----------|-------------|
| `bombshell-dev/no-generic-error` | error | No `throw new Error(...)` or other builtin error constructors. Use project-specific error classes. |
| `bombshell-dev/max-params` | error | Max 2 parameters in authored signatures — use an options bag. Exempt: `override` methods, members of classes that `extends`/`implements`, inline callbacks. |
| `bombshell-dev/require-export-jsdoc` | warn | Exported functions and classes must have a `/** ... */` JSDoc comment. **Public API surface only** (see below). |
| `bombshell-dev/exported-function-async` | warn | Exported functions must use `async`. Adding async later is a breaking change. **Public API surface only** (see below). |

## Public API Surface Scoping

`require-export-jsdoc` and `exported-function-async` encode conventions that
exist to prevent breaking changes for consumers — so they only apply to files
consumers can import. `bsh lint` derives the public surface from
`package.json` (`exports`, `bin`, `main`/`module`, mapping `dist/` paths back
to `src/`), including conventional `packages/*/` workspace members, and scopes
these rules to those files via oxlint `overrides`. Internal modules, packages
without a publish surface (apps, examples), and wildcard passthrough exports
(`"./*": "./dist/*"`) are exempt.

## oxlint Categories

These apply in addition to individual rules:

| Category | Severity |
|----------|----------|
| `correctness` | error |
| `suspicious` | warn |

## Enabled Plugins

`unicorn`, `typescript`, `oxc`, `import`, `node`, plus the custom `bombshell-dev` JS plugin.

## Other Tools

| Tool | Where it runs | What It Catches |
|------|---------------|-----------------|
| **knip** | `bsh lint` | Unused dependencies/devDependencies (always); unused exports/types/files (`--strict` only) |
| **tsgo** | `bsh lint` | TypeScript type errors (`--noEmit`, project mode) |
| **publint** | `bsh build` (publish gate) and `bsh publint` | Incorrect `package.json` exports, missing types, invalid fields (strict mode) |

publint does not run in `bsh lint` — its file-existence checks need `dist/`,
so it gates the build instead.
