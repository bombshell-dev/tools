---
'@bomb.sh/tools': minor
---

Replaces the stock `max-params` lint rule with a Bombshell-aware version

The 2-parameter limit (use an options bag beyond that) now only applies to signatures we author. Functions conforming to APIs we don't control are exempt: `override` methods, members of classes that `extends` or `implements` (e.g. Node streams, platform-shaped interfaces), and inline callbacks passed to other functions.
