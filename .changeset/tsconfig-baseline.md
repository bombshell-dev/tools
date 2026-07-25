---
'@bomb.sh/tools': minor
---

Updates the shared `tsconfig.json` baseline for modern Node packages

- `target` and `lib` move from `es2022` to `es2024`, so modern APIs like `Array.prototype.toSorted` and `Promise.withResolvers` type-check without shims.
- Adds `"types": ["node"]`. Packages must now have `@types/node` installed — missing it previously surfaced as dozens of `Cannot find name 'process'/'Buffer'` (TS2591) errors; now it's a single actionable `Cannot find type definition file for 'node'` (TS2688). Remedy: `pnpm add -D @types/node`.
