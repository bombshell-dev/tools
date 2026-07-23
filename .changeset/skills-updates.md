---
'@bomb.sh/tools': patch
---

Updates the `lint`, `build`, and `lifecycle` skills to match current `bsh` behavior

The lint skill no longer claims publint runs in `pnpm run lint` (it gates `pnpm run build`), documents `--strict`, `--warnings`, and `--format json`, and adds a remedies table mapping common violations to their sanctioned fixes. The lifecycle skill moves the knip dead-code gate (`lint --strict`) to the PR handoff step.
