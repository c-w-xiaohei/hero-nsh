# Examples

Five standalone product pages and one component catalogue built with `hero-nsh`. Each product
page mounts itself, keeps its own state, and has no navigation around it: open it, run it, copy
what you need. `gallery.tsx` is the other way round: every export on one scrolling page, grouped
by what it is for, which is the fastest way to see what the package draws.

| Page | Run it |
|---|---|
| `demo/gallery/index.tsx` | `nsh run examples/demo/gallery.tsx --target web` |
| `demo/login.tsx` | `nsh run examples/demo/login.tsx --target web` |
| `demo/settings.tsx` | `nsh run examples/demo/settings.tsx --target web` |
| `demo/orders.tsx` | `nsh run examples/demo/orders.tsx --target web` |
| `demo/dashboard.tsx` | `nsh run examples/demo/dashboard.tsx --target web` |
| `demo/profile.tsx` | `nsh run examples/demo/profile.tsx --target web` |

Type-check one page with `nsh check examples/demo/login.tsx`, or all five with
`for f in examples/demo/*.tsx; do nsh check "$f"; done`.

## Why `demo/` carries its own configuration

An NSH app is a directory with `nsh.json`, and `nsh.json` cannot extend another one. The one
app directory therefore holds the shared setup for every page:

- `theme` points at `../../theme/hero-nsh.theme.json`;
- there is no `tailwind` block. The radius, shadow and easing the components draw with come
  from `src/tokens/geometry.ts` and the `radius-field` token of the theme file, so an app
  needs nothing beyond `theme` (an installed package works the same way);
- `resolve.alias` sends `hero-nsh` to `../../src/index.ts`, so the pages run against this
  checkout instead of an installed package;
- `fonts/` holds Inter, because the web host only serves assets inside the app directory.

## Coverage

The five pages cover the components a product page normally composes. Four are not merged
yet and live in `tmp/worktrees/`: `table`, `toast`, `tooltip` and `combo-box`. A few
low-level parts (`ColorPicker`, `DateInputGroup`, `InputGroup`, `NumberField`) are exercised
by the harness rather than these pages.
