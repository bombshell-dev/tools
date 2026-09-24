---
'@bomb.sh/tools': minor
---

Changes `bsh sync` to link skills into `.agents/skills/` instead of `skills/`. Re-run `bsh sync` to move existing links; it removes the old `skills/` links and updates the `.gitignore` and `AGENTS.md` entries.
