---
"hero-nsh": minor
---

Require NSH 0.6 and migrate to it.

- `onKeyDown` / `onKeyUp` are real view props now (nsh 0.6's `KeyEvent` channel); they reach `Input`, `View`-rooted fields and Radio instead of being dropped.
- Menu tells Enter from Space on web again (0.6 presses the focused control before the keymap).
- The inline code chip's padding is painted once after span padding started taking room (nsh#2141).
- `nsh.json` can declare `"nsh": ">=0.6"`; the README shows how.
