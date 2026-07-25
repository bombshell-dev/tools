---
'@bomb.sh/tools': minor
---

Restructures `bsh lint` output and tiers knip's dead-code checks behind `--strict`

- Errors are now always shown in full; warnings collapse to a per-rule count (pass `--warnings` to see them). Warnings never affect the exit code, so this keeps actual failures visible.
- Adds `--format json` for a machine-readable report (`{ summary, violations }`). Use `pnpm -s run lint -- --format json` to keep stdout clean.
- Knip's dead-code issues (unused exports, types, and files) now only run with `--strict` — they fire constantly mid-implementation and are only meaningful as a commit-time gate. Dependency hygiene issues (unused dependencies/devDependencies) still always run.
- Fixes `tsgo` silently type-checking nothing: file arguments made it skip the project `tsconfig` (TS5112), so default runs reported zero type errors. Type checking now always runs in project mode and explicit targets filter the report instead. This may surface previously hidden type errors.
- Widens the default oxlint target from `./src` to the whole project (gitignored paths like `dist/` are respected), matching the scope of knip and tsgo.
- Turns off `unicorn/consistent-function-scoping` and `no-underscore-dangle`, which fired frequently but were never deliberately enabled.
- `--fix` now only exits non-zero when errors remain (previously any warning failed the run).
