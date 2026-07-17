---
'@bomb.sh/tools': patch
---
Fixes `bsh sync` writing its output into the pnpm store instead of the project root. The project is now resolved from the invocation directory (`INIT_CWD`, falling back to `cwd`), so `skills/` symlinks, the `AGENTS.md` section, and the `.gitignore` entries land in the project that ran the command under pnpm's default isolated `node_modules` layout
