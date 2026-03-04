# Clink Feature Gaps Found During @bomb.sh/tools Migration

## Already Implemented (in this migration)

These changes were made directly to clink during the migration and need to be committed upstream.

### 1. `remaining` args in HandlerContext
**Problem:** The trie walker computes remaining/unconsumed args but dropped them before calling the handler. CLI tools commonly need to pass through unknown flags to underlying commands (e.g., `bsh build --dts` passes `--dts` through to tsdown).

**Changes made:**
- `src/api.ts`: Added `remaining: string[]` to `HandlerContext` type, `defineCommand` handler signature, and `exec()` function
- `src/framework/build/manifest.ts`: Updated `generateBin()` to pass `remaining` array to `command.handler()`
- `src/commands/exec.ts`: Rewrote to avoid parsing flags (they belong to target command), threads raw passthrough args into `remaining`
- `src/commands/index.ts`: Passes `match.remaining` through to `exec()`

### 2. Public `tools.exec` API (powered by tinyexec)
**Problem:** The `Exec` class was internal-only (used by `git` and `pm`). Command handlers had no way to shell out to arbitrary binaries.

**Changes made:**
- `src/framework/tools/exec.ts`: Replaced custom `spawn`-based implementation with `tinyexec`. Added automatic `node_modules/.bin` PATH prepending (like `zx`'s `preferLocal`). Added `stream()` method returning `AsyncIterable<string>` for line-by-line output processing.
- `src/framework/tools/index.ts`: Added `exec: Exec` to public `Tools` type and lazy loader
- `package.json`: Added `tinyexec` dependency

### 3. Flag passthrough in `clink exec`
**Problem:** `clink exec format --check` parsed `--check` via `@bomb.sh/args`, consuming it as an option instead of passing it through to the target command. This meant passthrough flags were silently swallowed.

**Changes made:**
- `src/commands/exec.ts`: Removed `@bomb.sh/args` parsing. Now splits argv into positional segments (for routing) and everything else (passthrough). Flags are never parsed — they belong to the target command.

## Remaining Gaps (nice-to-have)

### 4. Binary path resolution helper
**Problem:** CLI tools that wrap other CLI tools need to resolve `.bin` paths relative to their own package (not the consumer's project). After bundling, `import.meta.url`-based resolution may point to the wrong location.

**Current workaround:** The new `Exec` class automatically prepends `node_modules/.bin` to PATH, so bare command names (`oxlint`, `tsdown`, etc.) resolve correctly. This covers the common case.

**Edge case not covered:** When a CLI package needs binaries from its *own* `node_modules` (not the consumer's), the PATH prepending uses `session.cwd` which points to the consumer's project. For the tools use case this works because the binaries are direct dependencies, but a more robust solution would walk up from the CLI package's install location.

**Proposed API (if needed):**
```typescript
// Resolve .bin path relative to a specific package
const oxlint = tools.exec.bin('oxlint');
await tools.exec.runOrThrow(oxlint, args);
```

### 5. No-command help text
**Problem:** Running `bsh` with no arguments shows `Unknown command:` and exits. The old implementation listed available commands. The generated `bin.js` has no awareness of what commands exist for help text.

**Proposed:** Generate a help handler in `bin.js` that lists available commands from the trie when no args are provided.
