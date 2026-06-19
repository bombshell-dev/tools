---
"@bomb.sh/tools": patch
---

fix(init): read postprocessed files from the actual clone target, scaffold `.` in-place

`init <name>` cloned the template into `./<name>/` but postprocessed `package.json`/`README.md` from a stale hardcoded `./.temp/` path, crashing with `ENOENT`. The destination now points at the directory the template was actually cloned into.

`init` / `init .` now scaffolds into the current directory in-place (via giget `--force`) and derives the project name from the current directory's basename, instead of cloning into a mis-named subdirectory.
