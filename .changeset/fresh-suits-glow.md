---
"@bomb.sh/tools": patch
---

In some failure or no-op cases, oxlint seems to return output which is not json-parseable even with --json passed. Log output directly in these instances.
