---
"@bomb.sh/tools": patch
---

Fixes the `bsh init` command—it now points at the directory the template was actually cloned into.

`init` / `init .` now scaffolds into the current directory in-place and uses the current directory's basename as the project name.
