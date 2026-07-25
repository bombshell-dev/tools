---
'@bomb.sh/tools': minor
---

Makes `bsh` pass its own lint and widens the test fixture API

- The shared oxlint config now exempts `*.config.*` files and oxlint JS plugins (`rules/**`) from `import/no-default-export` — config files and plugins legitimately require default exports.
- `Fixture.write()` and `Fixture.append()` in `@bomb.sh/tools/test-utils` now accept plain strings (previously typed `Uint8Array`-only, which contradicted the runtime behavior).
- `bsh test` raises the default vitest `testTimeout` to 15s — integration tests spawn real oxlint/knip binaries, which can exceed 5s on a loaded machine.
- Internal: replaces all `node:path` usage with URL APIs, consolidates the duplicate knip config (`package.json#knip` was silently ignored in favor of `knip.jsonc`), and throws a coded `ToolsError` instead of a generic `Error`.
