---
name: writing-upgrade-guides
description: >
  Authoring a major-version upgrade guide or breaking-change migration document.
  Covers the standard guide structure, the per-entry format (past-tense before /
  present-tense after / "What should I do?"), verb choice by user impact, and
  diff-sample patterns. Use when shipping a major release or any document whose
  job is to walk users through breaking changes.
---

# Writing Upgrade Guides

An upgrade guide is a comprehensive, action-oriented list of **breaking changes a user must address to upgrade successfully**. It is not a feature showcase, not a release announcement, and not a CHANGELOG.

If a change doesn't block an existing project from upgrading, it doesn't belong here.

## Standard structure

Major-version upgrade guides follow a fixed structure. Use it as a template:

1. **Upgrade instructions** — the automated tool (e.g. an upgrade CLI), then manual steps for users who prefer it
2. **"Things may just work — if not, read on"** — set expectations: most projects upgrade cleanly
3. **Link to the full CHANGELOG** — for readers who want every detail
4. **Experimental flags removed** — list flags from `experimental:` config that are now stable or gone
5. **Dependency upgrades** — minimum runtime / engine / peer-dep versions that may affect projects
6. **Breaking changes** — the bulk of the guide
7. **Deprecations** — features that still work but will be removed in a future version
8. **Previously deprecated features now removed** — features deprecated in earlier versions that are gone now
9. **Community resources** — videos, blog posts, codemods (if any)
10. **Known issues** — anything users will hit that isn't fixed yet

Each section can be empty. Don't pad — if there are no deprecations this release, omit the heading.

## Per-entry format

Every entry under **Breaking changes** follows the same shape.

```markdown
### [verb]: feature/area name

In vX.x, [past-tense statement of what the library used to do].

vY.0 [present-tense statement of how the library works now].

#### What should I do?

[Imperative actions, often with a diff code sample.]
```

### Title verbs

Pick the verb by **how the user feels the impact**, not by what the code change technically is.

| Verb         | Use when                                                           |
| ------------ | ------------------------------------------------------------------ |
| `Changed`    | Behavior, signature, or shape moved in a way the user can feel     |
| `Renamed`    | An identifier — option, function, file — has a new name            |
| `Removed`    | A public API is gone                                               |
| `Added`      | A new behavior is now the default — the reader is "newly affected" |
| `Deprecated` | Still works for now, but slated for removal                        |

A new default value _is_ `Changed: default value for X`, even though the underlying code "added" something. Title from the reader's seat: "my default value got switched on me."

### The body

Two short statements: **what it was**, **what it is now**:

```markdown
### Changed: `app.render()` signature

In v3.x, the `app.render()` method accepted `routeData` and `locals` as separate, optional arguments.

v4.0 changes the `app.render()` signature. Both properties are now passed as a single object. Both the object and the properties remain optional.
```

That's it. No motivation essay. No anecdote. The reader is in a hurry — they want to know whether they're affected and what to do.

### "What should I do?"

This section is the heart of the guide. It is **always present**, even when the answer is short.

The instruction must be an **action**, not a fact:

❌ Statement of fact:

> The minimum supported runtime version is now 22.x.

✅ Imperative action:

> Check your runtime version with `node --version`. If it's below 22.x, upgrade to a supported version before installing.

Whenever the user must edit code, include a **diff** sample:

````markdown
#### What should I do?

If you maintain an adapter, the previous signature continues to work until the next major version.

To migrate now, pass `routeData` and `locals` as properties of an object instead of as separate arguments:

```diff
- app.render(request, routeData, locals)
+ app.render(request, { routeData, locals })
```
````

For deprecations, state the **migration window** so users know they have time:

> The `oldOption` is still honored in vY.0 and will be removed in vZ.0. Replace it with `newOption` at your convenience.

## Worked examples

### Example 1: signature change

````markdown
### Changed: `parseConfig()` signature

In v2.x, `parseConfig()` accepted a string path and returned a parsed config synchronously.

v3.0 makes `parseConfig()` async and accepts either a path or a `URL`. It now returns a `Promise<Config>`.

#### What should I do?

Await the result and update any callers:

​```diff

- const config = parseConfig('./project.toml')

* const config = await parseConfig('./project.toml')
  ​```
````

### Example 2: default-value change with opt-out

````markdown
### Changed: default value for `security.checkOrigin`

In v4.x, `security.checkOrigin` defaulted to `false`.

v5.0 changes the default to `true`, enabling CSRF protection for on-demand pages by default.

#### What should I do?

If you previously set `security.checkOrigin: true` explicitly, you can remove it — that's now the default.

To preserve the previous behavior, set `security.checkOrigin: false` explicitly:

​```diff
export default defineConfig({

- security: {
-     checkOrigin: false
- }
  })
  ​```
````

### Example 3: rewriting a fact-as-statement

❌ Useless:

```markdown
### Changed: minimum runtime version

The minimum supported runtime is now 22.x.

#### What should I do?

The minimum supported runtime is now 22.x.
```

✅ Action:

````markdown
### Changed: minimum runtime version

In v4.x, runtimes 18.x and newer were supported.

v5.0 requires 22.x or newer.

#### What should I do?

Check your installed version:

​`sh
node --version
​`

If it reports below 22.x, install a supported version before upgrading. Most version managers (e.g. fnm, nvm, volta) can install 22.x in one command.
````

## What does NOT belong in the upgrade guide

- **New optional features.** A feature the reader can ignore does not block upgrading. It belongs in the CHANGELOG, the release blog post, or proper feature docs — not here.
- **Internal refactors.** If nothing about the user-facing API changed, leave it out.
- **Bug fixes.** Same — the CHANGELOG covers these.
- **Lengthy "why" essays.** Save the rationale for a blog post. The guide exists to get the reader unblocked.

If you find yourself writing entries that don't have a "What should I do?" answer, they probably don't belong in the guide.

## Quick checklist

- [ ] Standard sections in order (or omitted when empty)
- [ ] Every breaking change has its own `###` entry
- [ ] Each entry's title verb reflects user impact, not code mechanics
- [ ] Body has two short statements: past behavior, present behavior
- [ ] "What should I do?" exists for every entry
- [ ] Imperative actions, not statements of fact
- [ ] `diff` sample included whenever the user must edit code
- [ ] Default-value changes show both directions (new default + opt-out)
- [ ] No new-feature announcements, no bug-fix entries

## See Also

- `writing-docs/SKILL.md` — imperative-instruction and code-sample conventions used here
- `writing-changesets/SKILL.md` — breaking-change changesets feed into this guide; the per-change content is often the source material for an upgrade-guide entry
