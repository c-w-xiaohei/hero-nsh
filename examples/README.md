# Examples

Five standalone product pages built with `hero-nsh`. Each file mounts itself, keeps its own
state, and has no navigation around it: open it, run it, copy what you need.

| Page | Run it |
|---|---|
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
- `tailwind` repeats the radius, shadow and easing tokens the components use. Without them
  the app still builds, but classes such as `ease-smooth` and `dark:shadow-surface-dark`
  are dropped with a warning;
- `resolve.alias` sends `hero-nsh` to `../../src/index.ts`, so the pages run against this
  checkout instead of an installed package;
- `fonts/` holds Inter, because the web host only serves assets inside the app directory.

## Coverage

Between them the five pages use every component exported from `src/index.ts` except the
four that are not merged yet: `table`, `toast`, `tooltip` and `combo-box`. They live in
`tmp/worktrees/` and join these pages once they land.
