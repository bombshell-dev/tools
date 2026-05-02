---
name: writing-docs
description: >
  Voice, style, structure, and code-sample conventions for user-facing software
  documentation — guides, reference pages, READMEs, recipes, API docs. Establishes
  the imperative instruction pattern, the "what to document vs. omit" rules, and
  the reference-entry format. Use when writing or reviewing prose docs.
---

# Writing Docs

Docs exist to **help readers do something and get back to their project**. Document **how to use** the thing — not how the thing is built.

## Purpose

Every page should answer questions a real reader has:

- What is this?
- What is it used for?
- Why would I use it?
- When can it (not) be used?
- How do I use it?

Implementation details only belong if they help the reader **make decisions**: choose a non-default value, avoid a conflicting setting, understand a tradeoff. Otherwise, leave them out.

## Voice and tone

- **Neutral, factual, direct.** State facts; don't try to be funny, whimsical, or chatty.
- **No first person.** Never `I`, `we`, `us`, `our`, `let's`. You aren't sitting next to the reader.
- **Address the reader as "you"** — sparingly, for emphasis or warnings. Most instructions don't need it (use the imperative instead).
- **Document only your thing.** Link out to authoritative sources for general concepts (Markdown, HTTP, regex). It is not your job to teach them.
- **Use exclamation points sparingly.** A frustrated reader at 2am does not want vibes.

## Readability heuristics

Prefer:

- shorter sentences and paragraphs
- plainer vocabulary
- active voice
- writing acronyms in full the first time
- headings and lists to break up long stretches of prose

Many readers are tired, in a hurry, reading in a non-native language, or translating the page into another language. Clear writing helps every one of them.

## Headings

- Page title is `<h1>`. New sections start at `<h2>`.
- Keep headings short — they appear in the page sidebar / table of contents.
- No end punctuation (`:`, `.`, `?`).
- Format code-shaped names as inline code, even in headings: `### \`navigate()\``.

## Lists

- **Unordered** for a group of related items where order doesn't matter (a set of options, properties, examples).
- **Ordered** when the steps must be followed in sequence.
- When list items grow into multiple paragraphs or are loaded with inline code, switch to subheadings.

## "Examples" vs. complete sets

`e.g.` means **some, not all**:

> If you store your project on a Git provider (e.g. GitHub, GitLab), you can…

When the list is **every possibility**, drop `e.g.`:

> Include the required image properties (`src`, `alt`) and any optional properties…

## Giving instructions

Use the **imperative**:

> Run the following command.

Not:

> ❌ Let's run the following command.
> ❌ Next, we will run the following command.

### Avoid weasel words

| Phrase        | Problem                            | When it's OK                                                                                                                                                  |
| ------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "You should…" | Reader can't tell if it's required | Describing expected outcome: "If installation succeeds, you should see a prompt" — and even then, prefer "After a successful install, there will be a prompt" |
| "You can…"    | Sounds permissive, not directive   | Genuinely granting permission or stating an option exists                                                                                                     |

If you find yourself writing "you should" in a step the reader is meant to follow, rewrite it as a direct instruction.

### No narrative scaffolding

Lead with the goal, then the steps. Don't tell a story.

❌ Narrative:

> As well as needing your content in different languages, you will often need to translate labels for UI elements around your site. We can do this by creating dictionaries of terms instead of hard-coding text in one language in our templates.
>
> 1. …

✅ Imperative + reason:

> Create dictionaries of terms to translate UI labels. This lets visitors experience your site fully in their language.
>
> 1. …

### Opinionated examples

When an instruction has many valid choices, separate the **action + criteria** from the **chosen option**:

❌ Vague:

> Add the `LanguagePicker` component to your site. A good place might be in a navigation component or a footer shown on every page.

✅ Action with criteria, then opinionated choice:

> Add the `LanguagePicker` component to a layout shown on every page. The example below adds it to the page footer:

The reader can substitute their own choice once they understand the criterion.

## Code samples

Code samples carry as much weight as the prose around them.

### Always include a sample file name

The reader needs to know **where this code goes**. Use a code-block title or a top-line comment:

````markdown
```ts title="src/lib/auth.ts"
export function signIn() {
  /* … */
}
```
````

````markdown
```ts
// src/lib/auth.ts
export function signIn() {
  /* … */
}
```
````

### Show one real, working example — not all options

No `foo` / `bar`. No "here are all six possible values for this config." The reader will only configure one. Pick a realistic one and show it complete.

### Introduce every code sample with a sentence

On its own line, before the block:

> The following example shows the `base` config set so the project deploys at `www.example.com/docs`:

This forces you to name what the snippet demonstrates and primes the reader to recognize it. Avoid `like so:` — it's a substitute for explaining what to do, and the reader's natural follow-up is "like _how_?"

❌

> Add slide animation, like so:

✅

> The following example shows a `slide` animation attribute added to a `<header>` component:

### Multiple code samples

Don't dump three blocks and explain them all in a paragraph below — readers will already have skimmed past. Introduce each block individually and connect them only after each has been described:

> The following example shows `draft: true` configured in the project config, which prevents draft posts from being built:
>
> ```js
> // …config sample
> ```
>
> The following Markdown file uses the `draft` property in its frontmatter to mark a post as not ready to publish:
>
> ```md
> // …frontmatter sample
> ```

## Reference entries

Reference pages exist to be **scanned**, not read. Each entry has a fixed shape.

### Format

```markdown
### `propertyOrFunctionName`

**Type:** `string | undefined`
**Default:** `'auto'`
**Added in:** `v1.4.0`

[One-sentence definition: what is this / what does this do.]

[Possible values, when applicable, as a bulleted list.]

[A minimal real-world code example.]
```

### Definition

The first line answers "What is this?" or "What does this do?" with an unwritten "This is…" or "This…" prefix:

- An array of allowed hosts.
- The base path to deploy to.
- Specifies the output target for builds.
- Enables CSRF protection for on-demand pages.

### Values

When the field accepts a small set of options, enumerate them:

- `'always'` — only match URLs with a trailing slash
- `'never'` — only match URLs without a trailing slash
- `'ignore'` — match URLs regardless

### Example

Show a single configured value, not every possibility:

```js
{
  trailingSlash: "always";
}
```

### Don't write a "why" essay

Reference entries are concise. Save the "when would I use this?" prose for guides — link from the entry when the topic genuinely needs explanation.

## Asides / callouts

Use sparingly. A callout for note, tip, or caution is for **complementary information that does not belong in the surrounding paragraph** — not for emphasis on essential information.

| Variant     | Use for                                           |
| ----------- | ------------------------------------------------- |
| **note**    | tangential context                                |
| **tip**     | optional action that may help                     |
| **caution** | risk of data loss, security, or other real danger |

Don't use:

- A **note** to add essential information — that belongs in the paragraph.
- A **tip** for a required step — that's not a tip, it's a requirement.
- A **caution** for mild surprises.
- Multiple callouts in a row — visual clutter erases meaning.

If everything is highlighted, nothing is.

## What NOT to document

- **Implementation details that don't change how the user uses the feature.** "We filter the array internally" tells the reader nothing they can act on.
- **Unsupported or off-happy-path uses.** "You can do this, but I wouldn't recommend it" — don't lead the reader down a dangerous path. They are free to explore on their own.
- **Every possible combination of options.** Document the common path and the realistic decision points. Edge cases live in issues, discussions, or recipes.

## See Also

- `writing-changesets/SKILL.md` — per-change CHANGELOG entries (uses the voice and code-sample patterns from this skill)
- `writing-upgrade-guides/SKILL.md` — major-version migration guides (uses the imperative-instruction and diff-sample patterns from this skill)
