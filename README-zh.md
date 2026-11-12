# hero-nsh

[HeroUI](https://www.heroui.com) 的 [NSH](https://nsh.dev) 实现，用 TSX 编写。

[English](README.md) | [简体中文](README-zh.md)

[![CI](https://github.com/c-w-xiaohei/hero-nsh/actions/workflows/ci.yml/badge.svg)](https://github.com/c-w-xiaohei/hero-nsh/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/hero-nsh)](https://www.npmjs.com/package/hero-nsh)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue)](LICENSE)

NSH 是一个原生 UI 运行时，支持 iOS、Android、macOS、Windows、Linux 和 Web，用 Rust 构建。你用 Rust 或 TSX 写应用，
它用各平台自己的工具包绘制——UIKit、Android 原生视图、AppKit、Win32、GTK 4、HTML——布局、状态和基础件由 NSH
负责，外观留给你。

hero-nsh 是 [HeroUI 仓库](https://github.com/heroui-inc/heroui) 的 NSH 移植版本。组件、变体和
`@heroui/styles` 3.2.7 的设计保持一致，实现重写在 NSH 的视图上。包直接发布 TSX 源码，由 `nsh` 和你的应用一起
编译：不需要第二套构建，也不需要 Vite 或 webpack。

## 为什么用 hero-nsh

不用引入 React 树，也能拿到 HeroUI 的设计。Button、Select、Table、Calendar、ColorPicker、Toast 等组件保留原来的
props 和插槽，用平台自己的文字、输入和无障碍能力绘制。主题和 `class` 覆盖在同一次编译里生效，改一个组件只差一个
类。

应用的 `nsh.json` 不需要 `"tailwind"` 块：颜色和 `radius-field` 来自包内附带的主题文件。

## 快速开始

安装 NSH（0.5.0 或更高版本）：

```sh
curl -fsSL https://nsh.dev/install.sh | sh
```

把包加进你的应用：

```sh
pnpm add hero-nsh
```

让 `nsh.json` 指向包内附带的主题文件：

```json
{
  "name": "my-app",
  "id": "com.example.my-app",
  "version": "0.1.0",
  "build": 1,
  "theme": "node_modules/hero-nsh/theme/hero-nsh.theme.json"
}
```

然后用一个组件：

```tsx
import { mount } from "nsh";
import { Button, Card } from "hero-nsh";

mount(() => (
  <Card>
    <Button>Save</Button>
  </Card>
));
```

`nsh run App.tsx` 在桌面打开它；`nsh run App.tsx --target web` 在浏览器打开。

> npm 上的 `nsh` 是无关的占位包。NSH 用上面的脚本安装，不要用 npm。

## 要求

- NSH 0.5.0 或更高版本。
- Web 目标需要先安装一次浏览器 runtime：`nsh component add web`。
- 日期或数字需要按非英文语言格式化的应用，在 `nsh.json` 的 `locales` 里列出这些语言；NSH 0.5 只打包应用点名
  的语言。

```json
{ "locales": ["de", "ja"] }
```

1.0 之前，破坏性变更随 minor 版本发布。

## 组件

| 分组 | 组件 |
|---|---|
| 操作与导航 | Button, ButtonGroup, CloseButton, ToggleButton, ToggleButtonGroup, Toolbar, Link, Breadcrumbs, Pagination |
| 表单 | Autocomplete, Checkbox, ComboBox, DateField, DateInputGroup, Description, ErrorMessage, FieldError, Fieldset, Form, InputGroup, InputOTP, Label, NumberField, Radio, RadioGroup, SearchField, Select, Slider, Switch, SwitchGroup, TextField, TimeField |
| 集合 | Accordion, Disclosure, DisclosureGroup, Dropdown, ListBox, Menu, Table, Tabs, Tag, TagGroup |
| 浮层 | AlertDialog, Drawer, Modal, Popover, Sheet, Toast, Tooltip |
| 颜色 | ColorArea, ColorField, ColorInputGroup, ColorPicker, ColorSlider, ColorSwatch, ColorSwatchPicker |
| 日期与时间 | Calendar, CalendarYearPicker, RangeCalendar |
| 展示 | Avatar, Badge, Card, Chip, EmptyState, Header, Icons, Kbd, Meter, ProgressBar, ProgressCircle, ScrollShadow, Separator, Skeleton, Spinner, Surface, Typography |
| 主题 | `theme/hero-nsh.theme.json` 与 `hero-nsh theme` 命令 |

## 主题

`nsh.json` 只接受一个主题文件。想在保留自己值的前提下从我们的主题起步，把包里的 token 合并进你的主题文件：

```sh
npx hero-nsh theme ./theme.json
```

命令只补你缺的键，绝不改你已经有的值；升级包之后再跑一次。`--dry-run` 只列出会补什么，不写文件。

要改单个组件，传 `class`。组件会把它接在自己的类之后，NSH 里后写的工具类生效：

```tsx
<Card className="shadow-none" />
```

阴影和缓动曲线是类字符串（`src/tokens/geometry.ts`），不是主题 token；用类覆盖。

## 示例

`examples/` 里有五个产品页面和一个组件总览。见 [examples/README.md](examples/README.md)。

## 许可证

Apache-2.0。见 `LICENSE` 与 `NOTICE`。组件设计与样式遵循 `@heroui/styles` 3.2.7。
