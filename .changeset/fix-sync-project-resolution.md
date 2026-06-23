---
"@bomb.sh/tools": patch
---

Fixes `bsh sync` failing to find the project to sync into. It now resolves the project from your current directory rather than the package's install location.
