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
| `max-params` | error | oxlint | Max 2 parameters per function |
| `typescript/explicit-function-return-type` | warn | oxlint/typescript | Function declarations need return types (expressions exempt) |
| `node/no-path-concat` | error | oxlint/node | No string concatenation with `__dirname`/`__filename` |

## Bombshell Custom Plugin Rules

Defined in `rules/plugin.js`, registered as the `bombshell-dev` plugin.

| Rule | Severity | Description |
|------|----------|-------------|
| `bombshell-dev/no-generic-error` | error | No `throw new Error(...)` or other builtin error constructors. Use project-specific error classes. |
| `bombshell-dev/require-export-jsdoc` | warn | Exported functions and classes must have a `/** ... */` JSDoc comment. |
| `bombshell-dev/exported-function-async` | warn | Exported functions must use `async`. Adding async later is a breaking change. |

## oxlint Categories

These apply in addition to individual rules:

| Category | Severity |
|----------|----------|
| `correctness` | error |
| `suspicious` | warn |

## Enabled Plugins

`unicorn`, `typescript`, `oxc`, `import`, `node`, plus the custom `bombshell-dev` JS plugin.

## Other Tools in the Pipeline

| Tool | What It Catches |
|------|----------------|
| **publint** | Incorrect `package.json` exports, missing types, invalid fields |
| **knip** | Unused dependencies, devDependencies, exports, types, files |
| **tsgo** | TypeScript type errors (`--noEmit`) |

These tools have no configurable rules in this project. They run with defaults (publint in strict mode, knip configured in `package.json`).
