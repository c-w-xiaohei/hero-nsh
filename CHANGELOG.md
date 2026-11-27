# hero-nsh

## 0.2.0

### Minor Changes

- 0b9a0c5: Require NSH 0.6 and migrate to it.
  
  - `onKeyDown` / `onKeyUp` are real view props now (nsh 0.6's `KeyEvent` channel); they reach `Input`, `View`-rooted fields and Radio instead of being dropped.
  - Menu tells Enter from Space on web again (0.6 presses the focused control before the keymap).
  - The inline code chip's padding is painted once after span padding started taking room (nsh#2141).
  - `nsh.json` can declare `"nsh": ">=0.6"`; the README shows how.
- c078955: Require NSH 0.7 and migrate to it.
  
  - `Tabs.Panel` is a real `tabpanel` now: NSH 0.7 added the role, so the panel no longer poses as a `region`, and screen readers say the user entered a tab's panel (a caller's `role` still wins when given).
  - Press and key payloads carry `modifiers.altGraph` (nsh 0.7's `Modifiers`). Key events report the AltGr level on Windows; presses carry the field but always report `false` (only key events set it).
  - Keyboard Enter / Space and assistive-technology activations report `clickCount: 0` on every platform, as the DOM's `detail` does; a press handler that counted clicks should test `>= 1`.
  - A horizontal tab list pages by one full step again under `dir="rtl"`: NSH 0.7 reports the scroll view's real content width, and the chevron clamp now uses it instead of the list's narrower layout bounds.
  - `nsh.json` can declare `"nsh": ">=0.7"`; the README shows how.

## 0.1.0

### Minor Changes

- 1ae8dee: First release: HeroUI v3 components for NSH, shipped as TSX source.
  
  ## Requirements
  
  - nsh 0.5.0 or later.
  - An app formatting dates or numbers in a language other than English lists it in `nsh.json` `locales`; nsh 0.5 bundles only the languages an app names.
  
  ## Included
  
  - Actions and navigation: Button, CloseButton, ToggleButton, Toolbar, Link, Breadcrumbs, Pagination.
  - Forms: Autocomplete, Checkbox, ComboBox, DateField, DateInputGroup, Description, ErrorMessage, FieldError, Fieldset, Form, InputGroup, InputOTP, Label, NumberField, Radio, RadioGroup, SearchField, Select, Slider, Switch, SwitchGroup, TextField, TimeField.
  - Collections: Accordion, Disclosure, DisclosureGroup, Dropdown, ListBox, Menu, Table, Tabs, Tag.
  - Overlays: AlertDialog, Drawer, Modal, Popover, Sheet, Toast, Tooltip.
  - Color: ColorArea, ColorField, ColorInputGroup, ColorPicker, ColorSlider, ColorSwatch, ColorSwatchPicker.
  - Date and time: Calendar, CalendarYearPicker.
  - Display: Avatar, Badge, Card, Chip, EmptyState, Header, Icons, Kbd, Meter, ProgressBar, ProgressCircle, ScrollShadow, Separator, Skeleton, Spinner, Surface, Typography.
  - Theme: `theme/hero-nsh.theme.json` and the `hero-nsh theme` command.
  
  ## Notes
  
  - Components ship TSX source; only the nsh toolchain builds them, not Vite or webpack.
  - `class` appends after the component's own classes; later utilities win.
  - Focus rings follow keyboard focus, as nsh 0.5 defines `focus-visible`.
  - Designs and styles follow `@heroui/styles` 3.2.7.
  
  ## License
  
  Apache-2.0. See `LICENSE` and `NOTICE`.
