---
"@bomb.sh/tools": minor
---

Updatess `oxfmt` config:

- Sets `"singleQuote"` option to `true`
- Adds `"*.json", "*.md", "*.yml", "*.jsonc"` to `"ignorePatterns"` option

Updates `format` command to include all files by default instead of the `./src` directory

Extracts `publint` from the `lint` command into a separate command
