---
"@bomb.sh/tools": patch
---

Fixes `bsh sync` crashing when creating skill symlinks on macOS, and makes re-running it safe. It no longer errors or removes already-synced skills.
