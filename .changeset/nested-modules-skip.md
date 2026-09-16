---
"@bomb.sh/tools": patch
---

`test` CLI command keeps vitest's default excludes, so test files inside nested `node_modules` are no longer collected.
