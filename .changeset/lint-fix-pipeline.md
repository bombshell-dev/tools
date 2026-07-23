---
'@bomb.sh/tools': minor
---

Makes `bsh lint --fix` fix far more than it used to

- `--fix` now chains `knip --fix` after oxlint: unused dependencies and devDependencies are removed from `package.json` automatically. Dead-code fixes (unused exports/types) additionally run with `--fix --strict`; unused files are never deleted automatically. knip fixes respect your knip config — keep `ignoreDependencies` accurate, since untraceable deps (e.g. binaries referenced by path) will otherwise be removed.
- The stock `no-console` rule is replaced by `bombshell-dev/no-console-log`, which auto-fixes `console.log` → `console.info` (semantically neutral in Node — they're the same stdout write). Other unlisted console methods are still flagged but not auto-fixed.
