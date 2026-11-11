# hero-nsh

[HeroUI](https://www.heroui.com) v3 components for [NSH](https://nsh.dev), written in TSX.

The package ships TSX source. Only the `nsh` toolchain builds it; it is not meant for Vite or webpack.

## Requirements

- `nsh` 0.5.0 or later. (The `nsh` package on npm is an unrelated placeholder, so it is not a peer dependency.) A
  release ships only its host's runtime: run `nsh component add web` before `nsh run --target web` or a web test.
- `pnpm add hero-nsh` (or npm, yarn) in the app directory.

## Setup

Point `nsh.json` at the theme file the package ships. It carries the colors and the `radius-field` token the
components read:

```json
{
  "name": "my-app",
  "id": "com.example.my-app",
  "version": "0.1.0",
  "build": 1,
  "theme": "node_modules/hero-nsh/theme/hero-nsh.theme.json"
}
```

```tsx
import { mount } from "nsh";
import { Button, Card } from "hero-nsh";

mount(() => (
  <Card>
    <Button>Save</Button>
  </Card>
));
```

Nothing else needs configuring. In particular the app's `nsh.json` needs no `"tailwind"` block: the radius,
shadows and easing curves are written into the components' classes (see `src/tokens/geometry.ts`).

nsh 0.5 bundles only English formatting data unless the app names its languages, so a non-English app lists them
in `nsh.json`. Without this, `NumberField`, `DateField` and the other locale-driven parts format in English:

```json
{ "locales": ["de", "ja"] }
```

## Changing the theme

`nsh.json` "theme" takes one file, so a theme you edit cannot be layered over this one. To start from ours and keep
your own values, merge it into your theme file:

```sh
npx hero-nsh theme ./theme.json
```

The command adds the keys your file lacks and never changes one it has, so run it again after upgrading the package
to receive new tokens. `--dry-run` lists what it would add without writing.

To change one component, pass a `class`: the components append it after their own classes, and in NSH the later
utility wins.

```tsx
<Card className="shadow-none" />
```

Shadows and easing curves are not theme tokens yet. NSH has no variable form for a shadow, so they are not part of
the theme file; override them with a class as above.

## License

Apache-2.0. See `LICENSE` and `NOTICE`; the component designs and their styles follow `@heroui/styles` 3.2.7.
