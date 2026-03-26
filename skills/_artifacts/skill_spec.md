# @bomb.sh/tools — Skill Spec

Unified internal CLI (`bsh`) that standardizes development workflows (build, dev, format, init, lint, test) across all Bombshell ecosystem projects by orchestrating opinionated configurations of industry-standard tools (tsdown, oxlint, oxfmt, vitest, knip, publint).

## Domains

| Domain | Description | Skills |
| ------ | ----------- | ------ |
| development workflow | End-to-end development lifecycle — TDD loop, command ordering, monorepo detection | lifecycle |
| code quality | Linting, formatting, and opinionated conventions | lint, format |
| compilation | Building TypeScript to ESM and running TypeScript natively | build, dev |
| testing | Writing and running tests with colocated conventions and fixture utilities | test |
| project setup | Creating new projects and migrating existing ones to bsh | init, migrate |

## Skill Inventory

| Skill | Type | Domain | What it covers | Failure modes |
| ----- | ---- | ------ | -------------- | ------------- |
| lifecycle | lifecycle | workflow | TDD workflow, pnpm run, monorepo detection, human-owned PRs | 6 |
| lint | core | quality | oxlint + publint + knip + tsgo, Bombshell conventions | 8 |
| build | core | compilation | tsdown ESM output, sourcemaps, declaration files | 3 |
| test | core | testing | vitest, colocated tests, createFixture, type-level tests | 4 |
| format | core | quality | oxfmt, tabs/single-quotes/semicolons style | 3 |
| dev | core | compilation | Node --experimental-transform-types, watch mode | 2 |
| init | core | setup | Template scaffolding via giget | 1 |
| migrate | lifecycle | setup | Removing old tools, consolidating to @bomb.sh/tools | 3 |

## Failure Mode Inventory

### Lifecycle (6 failure modes)

| # | Mistake | Priority | Source | Cross-skill? |
| - | ------- | -------- | ------ | ------------ |
| 1 | Using npx instead of pnpm run | CRITICAL | skill + interview | — |
| 2 | Running underlying tools directly | CRITICAL | skill + interview | — |
| 3 | Skipping TDD and implementing first | HIGH | skill + interview | — |
| 4 | Using npm, yarn, or bun | CRITICAL | skill | — |
| 5 | Running tsc directly | HIGH | skill + interview | — |
| 6 | Full autopilot PR creation | HIGH | interview | — |

### Lint (8 failure modes)

| # | Mistake | Priority | Source | Cross-skill? |
| - | ------- | -------- | ------ | ------------ |
| 1 | Using node:path instead of URL | CRITICAL | skill | lifecycle |
| 2 | Functions with more than 2 parameters | HIGH | skill + interview | lifecycle |
| 3 | Using console.log | MEDIUM | skill | — |
| 4 | Using default exports | HIGH | skill | — |
| 5 | Not using import type | MEDIUM | skill | — |
| 6 | Over-commenting obvious code | MEDIUM | interview | lifecycle |
| 7 | Not using bleeding-edge Node builtins | HIGH | interview | lifecycle |
| 8 | Preferring dependencies over builtins | HIGH | interview | lifecycle |

### Build (3 failure modes)

| # | Mistake | Priority | Source | Cross-skill? |
| - | ------- | -------- | ------ | ------------ |
| 1 | Passing unnecessary flags | MEDIUM | skill + interview | — |
| 2 | Running tsdown directly | HIGH | skill | — |
| 3 | CommonJS output configuration | HIGH | skill | — |

### Test (4 failure modes)

| # | Mistake | Priority | Source | Cross-skill? |
| - | ------- | -------- | ------ | ------------ |
| 1 | Placing tests in __tests__ directory | HIGH | skill | — |
| 2 | Extracting fixtures into shared variables | MEDIUM | skill | — |
| 3 | Testing implementation details | HIGH | interview | — |
| 4 | Running vitest directly | HIGH | skill | — |

### Format (3 failure modes)

| # | Mistake | Priority | Source | Cross-skill? |
| - | ------- | -------- | ------ | ------------ |
| 1 | Running prettier or biome format | HIGH | skill + interview | — |
| 2 | Using spaces instead of tabs | MEDIUM | conventions | — |
| 3 | Using double quotes | MEDIUM | conventions | — |

### Dev (2 failure modes)

| # | Mistake | Priority | Source | Cross-skill? |
| - | ------- | -------- | ------ | ------------ |
| 1 | Using tsx or ts-node | CRITICAL | skill | — |
| 2 | Installing TypeScript transpilers | HIGH | skill | — |

### Init (1 failure mode)

| # | Mistake | Priority | Source | Cross-skill? |
| - | ------- | -------- | ------ | ------------ |
| 1 | Manually scaffolding project structure | MEDIUM | skill | — |

### Migrate (3 failure modes)

| # | Mistake | Priority | Source | Cross-skill? |
| - | ------- | -------- | ------ | ------------ |
| 1 | Leaving old tool configs alongside bsh | HIGH | interview | — |
| 2 | Keeping old tool-specific scripts | HIGH | interview | — |
| 3 | Not moving tests to colocated pattern | MEDIUM | interview | — |

## Tensions

| Tension | Skills | Agent implication |
| ------- | ------ | ----------------- |
| Prototyping speed vs production lint strictness | lifecycle <-> lint | Agent either wastes time linting during exploration or ships unlinted code |
| Opinionated defaults vs explicit configuration | build <-> lint <-> format | Agent over-configures by passing redundant flags |
| Dev command stability vs experimental Node features | dev <-> lifecycle | Agent treats dev as equally stable as other commands |

## Cross-References

| From | To | Reason |
| ---- | -- | ------ |
| lifecycle | lint | Lint rules encode conventions that lifecycle enforces |
| lifecycle | test | TDD workflow requires understanding test conventions |
| migrate | lifecycle | After migration, adopt bsh lifecycle workflow |
| migrate | lint | Migration requires knowing which old configs to remove |
| test | lint | Tests must follow same coding conventions |
| build | dev | Both handle TS compilation in different modes |
| init | lifecycle | After init, enter lifecycle workflow |

## Subsystems & Reference Candidates

| Skill | Subsystems | Reference candidates |
| ----- | ---------- | -------------------- |
| lint | oxlint, publint, knip, tsgo | Bombshell-specific lint rules (>10 rules) |
| test | — | createFixture API |
| All others | — | — |

## Resolved Gaps

| Skill | Question | Resolution |
| ----- | -------- | ---------- |
| migrate | Migration order of operations? | Check existing → add unimplemented commands → replace 1:1 → evaluate remaining → migrate one by one |
| dev | When switch from experimental-transform-types? | Most packages don't need dev mode; TDD + running examples IS the dev loop |
| test | Additional test utilities planned? | Clack has MockReadable/MockWritable and vitest-ansi-serializer — candidates for extraction into test-utils |

## Recommended Skill File Structure

- **Core skills:** build, test, format, dev, init
- **Framework skills:** none (framework-agnostic)
- **Lifecycle skills:** lifecycle, migrate
- **Composition skills:** none (self-contained toolchain)
- **Reference files:** lint (dense rule surface)

## Composition Opportunities

| Library | Integration points | Composition skill needed? |
| ------- | ------------------ | ------------------------- |
| @bomb.sh/args | Argument parsing in CLI commands | No — internal dependency, not user-facing integration |
