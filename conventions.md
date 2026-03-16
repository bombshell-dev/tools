### Formatter settings (from `biome.jsonc`)

- **Indent style:** Tabs (not spaces) for code files.
- **Indent width:** 2.
- **Line width:** 100 characters.
- **Trailing commas:** `all` — always include trailing commas.
- **Quote style:** Single quotes (`'`).
- **Semicolons:** Always.
- **Expand:** `auto` — Biome auto-decides when to expand arrays/objects.

---

## 2. Import Conventions

### Always use the `node:` protocol for Node.js builtins

Enforced as an **error** via Biome's `useNodejsImportProtocol` rule. Every import of a Node built-in must use the `node:` prefix:

```ts
// ✅ Correct
import fs from "node:fs";
import path from "node:path";

// ❌ Wrong — will fail lint
import fs from "fs";
import path from "path";
```

### Enforce `import type` for type-only imports

Enforced as an **error** via Biome's `useImportType` rule. If an import is only used as a type (not at runtime), it must use `import type`:

```ts
// ✅ Correct
import type { AstroConfig } from "../types/public/config.js";
import { getFileInfo } from "../vite-plugin-utils/index.js";

// ❌ Wrong — pulls runtime code for a type-only import
import { AstroConfig } from "../types/public/config.js";
```

### Import organization

Biome's `organizeImports` assist is set to `"on"`, which auto-sorts and groups imports.

---

## 3. Restricted Use of Node.js APIs

This is a foundational architectural constraint. Astro code may run in non-Node environments like **Bun** or **Cloudflare Workers**, so Node.js API usage is strictly limited to specific areas of the codebase.

### Rules

- **Runtime-agnostic code** (code that shouldn't use Node.js APIs) should be placed inside folders or files called `runtime` (`runtime/` or `runtime.ts`).
- **Vite plugin implementations** may use Node.js APIs, but if a Vite plugin returns a **virtual module**, that virtual module cannot use Node.js APIs.
- Prefer **`URL` and file URL APIs** (`new URL(...)`, `import.meta.url`) over `node:path` string manipulation where possible. The codebase favors URL-based path handling for cross-runtime compatibility.

---

## 4. Function Signature Conventions

### Options bag pattern

Functions with more than two parameters are collapsed into an **options object**. This is a pervasive pattern throughout the codebase:

```ts
// ✅ Correct — options bag with a typed interface
interface CompileAstroOption {
  compileProps: CompileProps;
  astroFileToCompileMetadata: Map<string, CompileMetadata>;
  logger: Logger;
}

export async function compileAstro({
  compileProps,
  astroFileToCompileMetadata,
  logger,
}: CompileAstroOption): Promise<CompileAstroResult> { ... }
```

```ts
// ✅ Also correct — inline destructuring for simpler cases
export async function generateHydrateScript(
  scriptOptions: HydrateScriptOptions,
  metadata: Required<AstroComponentMetadata>,
): Promise<SSRElement> { ... }
```

### Public APIs should default to `async`

Public-facing functions default to being `async`, even if they don't strictly need to be today. This future-proofs the API against needing to introduce async operations later without a breaking change.

---

## 5. Error Handling Convention

Astro has a **unified, structured error system**. All errors go through a central `AstroError` class and are defined in a single data file.

### Never throw generic `Error` — use `AstroError`

```ts
// ❌ Wrong
throw new Error("Something went wrong");

// ✅ Correct
throw new AstroError({
  ...AstroErrorData.NoMatchingImport,
  message: AstroErrorData.NoMatchingImport.message(metadata.displayName),
});
```

### Error definitions live in `errors-data.ts`

All error data is centralized in `packages/astro/src/core/errors/errors-data.ts`. Each error follows a strict shape:

- **`name`** — A permanent, unique PascalCase identifier (never changed once published).
- **`title`** — A brief user-facing summary.
- **`message`** — Can be a static string or a function for dynamic context. Describes what happened and what action to take.
- **`hint`** — Optional. Additional context, links to docs, or common causes.

### Error writing guidelines (from `errors/README.md`)

- Write from the **user's perspective**, not Astro internals ("You are missing..." not "Astro cannot find...").
- **Avoid cutesy language** — no "Oops!" The developer may be frustrated.
- Keep messages **skimmable** — short, clear sentences.
- Don't prefix with "Error:" or "Hint:" — the UI already adds labels.
- **Names are permanent** — never rename, so users can always search for them.
- Dynamic messages use a function shape: `message: (param) => \`...\``.
- Avoid complex logic inside error definitions.
- Errors are **grouped by domain** (Content Collections, Images, Routing, etc.) and display on the error reference page in definition order.

---

## 6. Code Architecture Principles

### Decouple business logic from infrastructure

The CONTRIBUTING guide explicitly calls this out as a core principle:

- **Infrastructure:** Code that depends on external systems (DB calls, file system, randomness, etc.) or requires a special environment to run.
- **Business logic (domain/core):** Pure logic that's easy to run from anywhere.

In practice this means: avoid side effects, make external dependencies explicit, and **pass more things as arguments** (dependency injection style).

### Test all implementations

If an infrastructure implementation is just a thin wrapper around an npm package, you may skip testing it and trust the package's own tests. But all business logic should be tested.

---

## 8. Code Cleanliness Rules

All enforced at the **error** level:

| Rule                         | Effect                                                |
| ---------------------------- | ----------------------------------------------------- |
| `noUnusedVariables`          | No unused variables (with `ignoreRestSiblings: true`) |
| `noUnusedFunctionParameters` | No unused function parameters                         |
| `noUnusedImports`            | No unused imports                                     |
| `useNodejsImportProtocol`    | Must use `node:` prefix for Node builtins             |
| `useImportType`              | Must use `import type` for type-only imports          |

- Node.js engine requirement: `>=22.12.0`.
- Package manager: `pnpm` (enforced via `only-allow`).

---

## 12. Code Style

The observed patterns from the source code include:

- **Explicit return types** on exported functions.
- **Interface-first design** — define an interface for options bags, then destructure in the function signature.
- **JSDoc comments** on exported functions and complex internal functions, using `/** */` style. Avoid excessive or self-documenting comments.
- **Explicit `.ts` extensions in import paths** — even for TypeScript files, imports use literal extensions.
- **Avoid barrel files via `index.ts`** — packages organize re-exports through index files.
- **`const` by default** — `let` only when reassignment is needed.

---

## Summary of Key Rules

| Convention      | Details                                                                                    |
| --------------- | ------------------------------------------------------------------------------------------ |
| Formatter       | Biome: tabs, single quotes, semicolons always, trailing commas always, 100-char line width |
| Node builtins   | Always `node:` prefix (error-level lint rule)                                              |
| Type imports    | Always `import type` for type-only (error-level lint rule)                                 |
| Node.js APIs    | Restricted to non-`runtime/` code; virtual modules must be runtime-agnostic                |
| Function params | >2 params → options bag with a typed interface                                             |
| Public APIs     | Default to `async`                                                                         |
| Error handling  | Always `AstroError` with centralized error data; never generic `Error`                     |
| `console.log`   | Warned; use `console.info`/`warn`/`error`/`debug` instead                                  |
| Unused code     | Unused vars, params, and imports are errors                                                |
| Path handling   | Prefer `URL` / file URLs over `node:path` string manipulation                              |
| Testing         | Vitest via `astro-scripts`; `bgproc` for dev servers; `agent-browser` for HMR              |
| Scripting       | `node -e`, not Python                                                                      |
| Business logic  | Decouple from infrastructure; make dependencies explicit via arguments                     |
