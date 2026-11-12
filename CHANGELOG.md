# hero-nsh

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
