# hero-nsh

[HeroUI](https://www.heroui.com) for [NSH](https://nsh.dev), written in TSX.

[English](README.md) | [简体中文](README-zh.md)

[![CI](https://github.com/c-w-xiaohei/hero-nsh/actions/workflows/ci.yml/badge.svg)](https://github.com/c-w-xiaohei/hero-nsh/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/hero-nsh)](https://www.npmjs.com/package/hero-nsh)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue)](LICENSE)

NSH is a native UI runtime for iOS, Android, macOS, Windows, Linux and the web, built in Rust. You write the app in
Rust or TSX, and it draws with each platform's own toolkit — UIKit, Android views, AppKit, Win32, GTK 4, HTML — while
NSH handles the layout, state and primitives. The look stays yours.

hero-nsh is the NSH port of the [HeroUI repository](https://github.com/heroui-inc/heroui). The components, variants and
`@heroui/styles` 3.2.7 design are the same; the implementation is rebuilt on NSH's views. The package ships TSX
source, so `nsh` compiles it with your app: no second build, no Vite or webpack.

## Why hero-nsh

You get HeroUI's design without a React tree. Button, Select, Table, Calendar, ColorPicker, Toast and the rest keep
their props and slots, and draw with the platform's own text, input and accessibility. Your theme and your `class`
overrides apply in the same compile pass, so changing a component is one class away.

An app needs no `"tailwind"` block: the colors and `radius-field` come from the theme file the package ships.

## Quick start

Install NSH (0.5.0 or later):

```sh
curl -fsSL https://nsh.dev/install.sh | sh
```

Add the package to your app:

```sh
pnpm add hero-nsh
```

Point `nsh.json` at the theme file the package ships:

```json
{
  "name": "my-app",
  "id": "com.example.my-app",
  "version": "0.1.0",
  "build": 1,
  "theme": "node_modules/hero-nsh/theme/hero-nsh.theme.json"
}
```

Then use a component:

```tsx
import { mount } from "nsh";
import { Button, Card } from "hero-nsh";

mount(() => (
  <Card>
    <Button>Save</Button>
  </Card>
));
```

`nsh run App.tsx` opens it on the desktop; `nsh run App.tsx --target web` opens it in a browser.

> The `nsh` package on npm is an unrelated placeholder. Install NSH with the script above, not npm.

## Requirements

- NSH 0.5.0 or later.
- For the browser target, add its runtime once: `nsh component add web`.
- An app that formats dates or numbers in a non-English language lists it in `nsh.json` `locales`; NSH 0.5 bundles
  only the languages an app names.

```json
{ "locales": ["de", "ja"] }
```

Before 1.0, breaking changes ship in minor releases.

## Components

| Group | Components |
|---|---|
| Actions and navigation | Button, ButtonGroup, CloseButton, ToggleButton, ToggleButtonGroup, Toolbar, Link, Breadcrumbs, Pagination |
| Forms | Autocomplete, Checkbox, ComboBox, DateField, DateInputGroup, Description, ErrorMessage, FieldError, Fieldset, Form, InputGroup, InputOTP, Label, NumberField, Radio, RadioGroup, SearchField, Select, Slider, Switch, SwitchGroup, TextField, TimeField |
| Collections | Accordion, Disclosure, DisclosureGroup, Dropdown, ListBox, Menu, Table, Tabs, Tag, TagGroup |
| Overlays | AlertDialog, Drawer, Modal, Popover, Sheet, Toast, Tooltip |
| Color | ColorArea, ColorField, ColorInputGroup, ColorPicker, ColorSlider, ColorSwatch, ColorSwatchPicker |
| Date and time | Calendar, CalendarYearPicker, RangeCalendar |
| Display | Avatar, Badge, Card, Chip, EmptyState, Header, Icons, Kbd, Meter, ProgressBar, ProgressCircle, ScrollShadow, Separator, Skeleton, Spinner, Surface, Typography |
| Theme | `theme/hero-nsh.theme.json` and the `hero-nsh theme` command |

## Theming

`nsh.json` takes one theme file. To start from ours and keep your values, merge the package's tokens into your theme
file:

```sh
npx hero-nsh theme ./theme.json
```

The command adds the keys your file lacks and never changes one it has, so run it again after upgrading. `--dry-run`
lists what it would add.

To change one component, pass a `class`. Components append it after their own classes, and in NSH the later utility
wins:

```tsx
<Card className="shadow-none" />
```

Shadows and easing curves are class strings (`src/tokens/geometry.ts`), not theme tokens; override them with a class.

## Examples

`examples/` holds five product pages and a component gallery. See [examples/README.md](examples/README.md).

## License

Apache-2.0. See `LICENSE` and `NOTICE`. Component designs and styles follow `@heroui/styles` 3.2.7.
