---
name: writing-changesets
description: >
  Writing user-facing CHANGELOG entries with the Changesets tool — `.changeset/*.md`
  files declaring affected packages, bump kind (patch/minor/major), and a message.
  Covers verb choice, audience, level of detail, and breaking-change migration
  patterns with diff samples. Use when adding a changeset to a PR.
---

# Writing Changesets

A changeset is a Markdown file that declares **which packages changed**, **how to bump them**, and **what changed from the user's perspective**. It produces one entry in each affected package's CHANGELOG.

A user reads a changeset once, when they upgrade. It must answer: _did anything change that matters to me, and what do I do about it?_

## File format

Generate a changeset with:

```sh
pnpm changeset
```

This prompts for the affected packages and bump kinds, then writes a randomly-named file to `.changeset/`:

```md title=".changeset/witty-cats-bake.md"
---
"@your-org/your-package": patch
---

Fixes a regression where `parseConfig()` returned `undefined` instead of the default object.
```

You can also write the file by hand. The frontmatter lists every affected package on its own line:

```md title=".changeset/multi-package-change.md"
---
"@your-org/core": minor
"@your-org/cli": patch
---

Adds a new `--watch` flag.

#### `@your-org/core`

Exports a new `watch()` helper.

#### `@your-org/cli`

Wires `--watch` to call `watch()`.
```

Bump kinds:

- `patch` — bug fixes, internal refactors, perf improvements (no user code change required)
- `minor` — new features that are safe to opt into
- `major` — breaking changes, including any change to default behavior

## The message

### Lead with a present-tense verb

Every changeset starts with a verb completing the sentence "This PR…":

- **Adds** — new feature, option, function
- **Removes** — deletes a public API
- **Fixes** — bug fix
- **Updates** — changes existing behavior in a non-breaking way
- **Refactors** — internal cleanup
- **Improves** — perf, ergonomics, output quality
- **Deprecates** — marks something for future removal

### Describe the user's experience, not the code's

❌ What the code now does:

> Logs helpful errors if content is invalid

✅ What the user will experience:

> Adds logging for content collection configuration errors

The reader doesn't care what the diff did internally. They care what they'll notice.

### Include the API name when readers might be using it

When the changed surface has a recognizable name, put it in the message:

❌ Vague:

> Improves automatic fallback generation

✅ Specific:

> Improves automatic `fallbacks` generation for the new Fonts API

If the API isn't user-facing or the name wouldn't ring a bell, describe the use case instead:

❌ Reader won't recognize the type:

> Adds `| (string & {})` for better autocomplete of `App.SessionData`

✅ Reader recognizes the outcome:

> Improves autocompletion for session keys

## Patch changes

Patch changes are usually internal: bug fixes, refactors, perf wins. The reader skims to decide if it's relevant.

Keep them short — often one line:

```md title=".changeset/one-liner.md"
---
"@your-org/core": patch
---

Fixes a bug where the inspector incorrectly flagged inline images as above the fold
```

```md title=".changeset/refactor.md"
---
"@your-org/core": patch
---

Refactors internal handling of styles and scripts to improve build performance
```

```md title=".changeset/type-update.md"
---
"@your-org/core": patch
---

Updates the `HTMLAttributes` type exported from `@your-org/core` to allow data attributes
```

Patch entries don't need full sentences or end punctuation when they fit on one line. State **what changed** _and_ **who needs to know** — the reader should be able to decide in five seconds whether to keep reading.

## Minor changes (new features)

Start with **Adds**. Name the new option, function, or component in the first sentence. Then say what users can now do that they couldn't before.

````md title=".changeset/new-feature.md"
---
"@your-org/core": minor
---

Adds a new, optional `timeout` option to `defer()`.

This value sets a maximum wait, in milliseconds, before the deferred work is flushed, even if the trigger condition hasn't been met. You can use it to bound the latency of low-priority work while still preferring the natural flush point.

```ts
defer(work, { trigger: "idle", timeout: 500 });
```
````

A minimal usage example is almost always worth including for new features. Don't try to cover every option — pick one realistic call.

> **Don't hide the good stuff in the changeset.** A changeset is read once, on upgrade. Documentation is referenced forever. Everything you put in a changeset should also exist in the proper feature docs.

## Major changes (breaking)

Verbs like **Removes**, **Changes**, **Deprecates** signal _required attention_. Unlike a new feature the reader can ignore, a breaking change cannot be skipped.

A breaking-change changeset must include **migration guidance**, almost always with a `diff` code sample:

```md title=".changeset/breaking-removal.md"
---
"@your-org/core": major
---

Removes support for returning plain objects from endpoints. Endpoints must now return a `Response` instead.
```

For an API rename or signature change, show the before and after:

````md title=".changeset/breaking-shape-change.md"
---
"@your-org/core": major
---

Removes support for passing a `path` string to the `plugins` option. Import the plugin module directly and pass it instead.

```diff
+ import customPlugin from './plugins/custom.js'

  export default defineConfig({
    plugins: [
-     { path: './plugins/custom.js' },
+     customPlugin,
    ],
  })
```
````

### Default-value changes

Changing a default value is a breaking change even if no API surface moved — most users don't set a value explicitly, so they're affected silently.

Document **both directions**: how to opt back into the old behavior, _and_ the fact that anyone who already set the new value can drop it.

````md title=".changeset/default-flip.md"
---
"@your-org/core": major
---

Changes the default value of `security.checkOrigin` to `true`, enabling CSRF protection by default for on-demand pages.

If you previously set `security.checkOrigin: true`, you no longer need it — this is now the default and the line can be removed.

To restore the previous behavior, set `security.checkOrigin: false` explicitly:

```diff
  export default defineConfig({
+   security: {
+     checkOrigin: false
+   }
  })
```
````

## Section headings inside long changesets

When a changeset spans multiple paragraphs and needs internal structure, **start headings at `<h4>` (`####`)** — never `<h2>`. Changesets are concatenated into a CHANGELOG file where the package name and version are already at the `<h2>`–`<h3>` level. Using `##` inside a changeset breaks the hierarchy of the rendered CHANGELOG.

```md title=".changeset/long-feature.md"
---
"@your-org/core": minor
---

Adds a new Sessions API to store user state between requests for on-demand pages.

#### Configuring session storage

…

#### Using sessions

…

##### In API endpoints

…

#### Upgrading from the experimental API

…
```

## Quick checklist before merging

- [ ] Frontmatter lists every affected package with the right bump kind
- [ ] Message starts with a present-tense verb (Adds, Removes, Fixes…)
- [ ] Describes the user-facing change, not internal mechanics
- [ ] Names the changed API when the name is recognizable
- [ ] Breaking change? Includes a `diff` migration sample
- [ ] Default-value change? Documents both the new behavior and the opt-out
- [ ] Section headings (if any) start at `####`
- [ ] The same explanation also exists in proper feature docs

## See Also

- `writing-docs/SKILL.md` — voice, code-sample, and instruction conventions used here
- `writing-upgrade-guides/SKILL.md` — for major releases, breaking-change changesets feed into the upgrade guide
