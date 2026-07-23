---
'@bomb.sh/tools': minor
---

Scopes the `bombshell-dev/exported-function-async` and `bombshell-dev/require-export-jsdoc` lint rules to a package's public API surface

`bsh lint` now derives the public surface from `package.json` (`exports`, `bin`, and `main`/`module`, mapping `dist/` paths back to `src/`), including conventional `packages/*/` workspace members. These two rules no longer fire on internal modules — only on files consumers can actually import. Packages without a publish surface (apps, examples) are exempt entirely, and wildcard passthrough exports (`"./*": "./dist/*"`) don't designate surface.
