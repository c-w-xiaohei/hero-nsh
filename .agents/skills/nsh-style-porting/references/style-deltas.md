# NSH 样式系统与 CSS 行为差异清单

版本锚点：NSH 0.5.0（本机 CLI 实测）；`tmp/vendor/nsh-src` 仍是 0.4.0 的证据快照，下文 `文档路径:行号` 指向它，0.5 的行为变化已在对应条目标注。Taffy 0.15.0、Tailwind 4 / HeroUI 3.2.7 作为对照。
适用范围：只讲**样式规则**——布局、尺寸、类解析、绘制、动效、文字、单位与主题。不列具体组件的修法，也不重复 API、DOM 属性、无障碍语义的差异。
证据约定：`文档路径:行号` 指 vendored 的 `tmp/vendor/nsh-src`；实测数字来自 `tmp/issue-minh`（纯盒模型）与 `tmp/repro-app/flexlab.tsx`（样式矩阵）；CSS 基线用同一个 Chrome 打开纯 HTML。

路径约定：`tmp/vendor/nsh-src/...` 是本仓库的 NSH 0.4.0 证据快照；在其他 NSH checkout 里，同样的内容位于仓库根的 `website/docs/...`、`crates/...` 与 `docs/dev/...`。`tmp/issue-minh`、`tmp/repro-app` 是本仓库的复现产物；换仓库时按同样的纯盒模型重建即可，规则不依赖这些路径。

---

## 0. 三十秒版本

1. **View 默认是列**，`flex` 才是行；`flexShrink` 默认 0，最小宽高默认 0（CSS 是 1 / auto）。
2. **`flex-1` 的 basis 是零长度，不是零百分比**：NSH 存 `1 1 0`，Tailwind 的 `flex-1` 是 `1 1 0%`。在未定高容器里，`0%` 按内容解析，`0` 是确定的零，于是 NSH 更容易塌。
3. **交叉轴测量不看 automatic minimum**：行里一个高度 auto 的列，列的高度按子项 flex basis 求和；子项设了 `min-h-auto` 会自己长高，父级不涨，内容画到列外。
4. **类串不是级联**：同类层后写者赢；变体（含断点）永远晚于普通类。覆盖带 `md:` 的槽类，必须自己带 `md:`。
5. **没有行内格式化上下文**：`inline-flex` 在块级父容器里会被当成块，通常要补 `w-fit`。
6. **没有伪元素、`:has()`、后代/子选择器**：分隔线、扫光、箭头、指示点都要变成真实子视图；后代样式改由 context 或登记实现。
7. **过渡只有一组时长/曲线**：多属性不同时长只能合并；布局属性（宽高）不参与 CSS transition，用 `LayoutAnimation` / `reveal`。
8. **`overflow-x-hidden` 同时裁两轴**；滚动是 `Scroll` 元素，不是 CSS `overflow: auto`。
9. **文字必须落在 `Text` 里**；View 上的 `text-*` / `font-*` 会继承给内部 Text；`lineHeight` 的数字是点，不是倍数。
10. **没有 CSS 变量级联、没有子树主题、没有 container query**；断点是窗口宽度。

---

## 1. 布局默认值

### 1.1 默认列，`flex` 才是行

| | CSS | NSH |
|---|---|---|
| 未设置 display 的容器 | 块级流式，子元素自上而下 | **flex 列**（`flexDirection: "column"`） |
| `display: "flex"` / `class="flex"` | 行（row） | 行（row），与 CSS 一致 |
| `display: "block"` / `class="block"` | 块级流式 | Taffy block 布局 |
| `inline` / `inline-block` | 行内盒 | 按块处理（见 §4） |

依据：`website/docs/layout.md:18-25`；`crates/nsh-core/src/style.rs:1434-1450`（`impl Default for Style`，注释写明 "React Native defaults, which differ from CSS (and taffy) defaults"）。

**规则**：每个根容器的 display 与方向都要显式写。纵向排列碰巧一致，横向排列必须 `flex-row` / `flex`。

**块布局的边界**：`display: block` / `flow-root` 走 Taffy 的 block 布局；`float` / `clear` 没有。依赖浏览器 block formatting context 的排版（margin 塌陷、浮动环绕）要先在目标上验证，不能按 CSS 的直觉假设。

### 1.2 `flexShrink` 默认 0

CSS：flex 子项默认 `flex-shrink: 1`，空间不够时收缩（文字换行、省略）。
NSH：默认 0，子项保持自己的尺寸，超出父级。

依据：`layout.md:22`；`styling.md:109-115`。

**规则**：上游靠默认收缩实现的效果，必须显式写 `shrink` / `min-w-0` / `truncate` / `basis-auto`。固定宽度行里的长文本不会自动换行，而是溢出。

### 1.3 最小尺寸 0 与 automatic minimum

CSS：flex 子项 `min-width/min-height` 默认 `auto`，即"内容的最小尺寸"。
NSH：默认 0（Yoga 的默认，省掉每个子项的最小内容测量）。
`min-w-auto` / `min-h-auto` 是显式恢复 CSS 的 automatic minimum。

依据：`layout.md:25`；`layout.md:92`；`docs/dev/styles.md:41-45`。

**注意**：`min-h-auto` 只在主轴可靠；交叉轴（§2.4）不成立。不要把它当成通用补丁。

### 1.4 `position` 默认 relative

CSS：`static`；`absolute` 子项相对最近的 positioned 祖先。
NSH：`relative`；几乎所有 View 都是定位上下文。

依据：`layout.md:24`。

**规则**：上游依赖"没有定位祖先时相对页面"的写法，在 NSH 里会相对最近的 View；浮层、角标要显式安排定位上下文。

### 1.5 `alignContent` 默认 flex-start

CSS：`normal`；NSH：`flex-start`（grid 里仍是 `normal`）。多行 flex 容器里 `align-content` 的行为因此不同。`flex-wrap` 布局要显式写对齐。

依据：`layout.md:23`。

### 1.6 百分比、auto margin、box-sizing

- 百分比相对父级尺寸；padding/margin 的百分比相对父级宽度，与 CSS 一致（`layout.md:100-110`）。
- `margin: auto` 在 flex 中可用（`layout.md:102`）。
- 默认 `box-sizing: border-box`（Tailwind preflight 的语义）；`box-border` 是显式写法，`box-content` 没有。

### 1.7 尺寸关键字、比例与网格

- 尺寸支持点、百分比、`auto`，以及 `fit-content` / `min-content` / `max-content`（`layout.md:100-104`）；类 `w-fit` / `w-min` / `w-max`，高度同理。
- `aspectRatio` 支持，类 `aspect-*`；给定一边推另一边，与 CSS 一致（`layout.md:111-113`）。
- 视口单位支持：`w-screen`、`h-dvh` / `h-svh` / `h-lvh`（`tailwind.md` 的任意值一节；类里有 `screen` / `dvh` / `svh`）。
- 网格：`display: grid`、`grid-template-columns/rows`（字符串轨道）、`grid-auto-flow`、`grid-column/row` 的 start / span、`gap`、`justify-items` / `align-items` / `justify-self` / `align-self` 都有。
- **没有 `grid-template-areas` / `grid-area`**：上游用命名区域的地方要改成显式的行列线（`col-start-*` / `row-start-*` / `col-span-*`），这也是为什么移植时经常要多写几行定位类。
- 没有 subgrid；`grid-auto-*` 的隐式轨道按 CSS 的语义走，但复杂模板要先在小组件里验证。

### 1.8 RTL 与逻辑属性

- 逻辑属性按方向解析：`ps-*` / `pe-*` / `ms-*` / `me-*`、`start-*` / `end-*`、`border-s` / `border-e`、`rounded-ss-*` / `rounded-se-*`；物理属性 `pl-*` / `ml-*` / `left-*` / `border-l` / `rounded-tl-*` 固定不翻转（`layout.md:254-255`）。
- `rtl:` / `ltr:` 变体有；`direction` 是布局方向，`writingDirection` 是文字基线方向（扩展），两者不要混。
- 方向相关的图标（箭头、chevron）要显式 `rtl:rotate-180` 或按 `locale()` 计算；RTL 下的键盘方向键、滑块换算也要单独看，不是样式类能覆盖的。

---

## 2. 内在尺寸与 flex basis

### 2.1 CSS 的规则

- 列方向的自动高度 = 子项的 max-content 贡献之和。
- Tailwind 的 `flex-1` 是 `flex: 1 1 0%`；零百分比在**未定高**容器里按内容解析。
- `min-height: auto` 把子项托到内容高度，父级跟着长高；显式 `min-height: 0` 才会让父级塌。
- 显式 `flex: 1 1 0px; min-height: 0` 是另一回事，那确实会塌。

### 2.2 关键差异：`flex-1` 的 basis 单位

NSH 的 `flex-1` 展开成 `flexGrow: 1, flexShrink: 1, flexBasis: 0`（零**长度**）。CSS / Tailwind 的 `flex-1` 是 `1 1 0%`（零**百分比**）。

在未定高容器里：

| basis 写法 | Chrome 146 |
|---|---|
| `flex: 1 1 0%` + `min-height: auto` | 卡片 212 / 内容 116 |
| `flex: 1 1 0%` + `min-height: 0` | 卡片 212 / 内容 116 |
| `flex: 1 1 0px` + `min-height: auto` | 卡片 212 / 内容 116 |
| `flex: 1 1 0px` + `min-height: 0` | 卡片 96 / 内容 0 |

依据：`crates/nsh-core/src/tailwind/utilities.rs:1468`（`flex-1` 写 `FlexBasis 0.0`）；Chrome 实测见 `tmp/issue-minh/baseline-min.html` 与 `baseline2.html`。

**这条比"RN 默认值"更具体**：即使 `min-height: 0`，`0%` 也不会塌；NSH 的 `flex-1` 等价于 `0px`，所以它在未定高上下文里比它要替换的类更容易塌。

### 2.3 实测矩阵

纯盒模型：5 个 20px 盒子 + 4px 间距 = 内容高 116；外层列 padding 16、gap 12、header/footer 各 20，正确高度 212。

| 形状 | NSH `flex-1` | NSH `flex-1 min-h-auto` | NSH `flex-auto` | Chrome（`0%`） |
|---|---|---|---|---|
| 卡片在**行**里，`items-start` | 96 / 0 | **96 / 116（溢出 100）** | 212 / 116 | 212 / 116 |
| 卡片在**列**里 | 212 / 116 | 212 / 116 | 212 / 116 | 212 / 116 |
| 卡片固定 `h-[100px]` | 100 / 0 | 100 / 116（溢出） | 100 / 116 | 100 / 116 |
| 行 `items-stretch` | 212 / 116 | 212 / 116 | 212 / 116 | 212 / 116 |
| 行 `items-center` / `items-end` / `self-start` | 96 / 0 | 96 / 116 | 212 / 116 | 212 / 116 |

读法：
- 父级是列 → 主轴路径，正确。
- 行 + `stretch` → 交叉轴由行定高，掩盖问题。
- 行 + 非 stretch → **交叉轴内容测量**，问题出现。
- 显式 `min-h-[300px]` 正确，`min-h-auto` 不正确 → automatic minimum 没有进入父级的交叉轴尺寸。

### 2.4 `min-h-auto` 的边界

它能让子项自己拿到内容高度，但父级的交叉轴 intrinsic size 计算没有把这份最小尺寸算进去。Taffy 0.15.0 的 `determine_hypothetical_cross_size` → `determine_container_main_size` 走"可用空间确定"分支，按 `flex_basis.max(style min)` 求和，不使用上一步已经算好的 `hypothetical_inner_size`。

上游跟踪：`DioxusLabs/taffy#351` §9.9.2（Intrinsic Cross Sizes 未完成）、`#1182`、`#1165`、`#1299` case 1/2。NSH 0.4.0 / 0.5.0 锁的都是 taffy 0.15.0；0.15.1 未修这个问题；nightly 的垂直分支仍需确认。

### 2.5 规避规则

> 任何来自 CSS 的 `flex-1`，只要它所在的容器高度由内容决定，就写成 `flex-auto`（或 `flex-1 basis-auto` / `grow`）。

三种写法在行、列、固定高度、stretch 下都与 CSS 的 `flex: 1 1 0%` 一致（实测 212 / 116）。`min-h-auto` 不是可靠的替代。

### 2.6 典型形状

```css
/* 上游 */
.panel { display: flex; flex-direction: column; height: auto; }
.panel-body { flex: 1; }        /* = 1 1 0% */

/* NSH 的等价写法 */
/* class="flex flex-col" + class="flex-auto" */
```

只要出现"行里的自适应高度列 + 内部 `flex-1`"，就按 §2.5 处理；这与具体业务组件无关。

### 2.7 上游 issue 判定

这是一个成立的上游 core 布局 bug，不是文档错误、也不是用户误用：

- 显式 `min-height` 生效、`min-h-auto` 不生效，精确指向交叉轴 intrinsic size；
- 行宽方向的同族问题已经由 NSH #927 / #1461 修过，垂直方向没有对应分支；
- 根因在 Taffy 0.15.0；NSH 可以在 `compute_flex_layout` 补一个对称分支。

ASCII / 文本根因链：

```text
父级是行，align-items ≠ stretch
  → 行把列容器当交叉轴尺寸来量
  → 列的 main size 是 auto，但 Taffy 走了"可用空间确定"的分支
  → 按 flex_basis.max(style min) 求和
  → automatic minimum 丢失；0% basis 也退化成 0
  → 子项 116、父级 96，子项与 footer 画到父级外
```

最小复现（无组件、无文本）与英文 issue 草稿见 `tmp/issue-minh/`。

---

## 3. 类解析不是 CSS 级联

### 3.1 后写者赢的边界

NSH 没有样式表、没有选择器特异性、没有 `@layer`。一个元素的样式 = 默认样式 → `class` → `classList` → 内联 `style`。同一层级里，字符串中靠后的类覆盖靠前的类。

依据：`website/docs/tailwind.md:66-70`；`docs/dev/styles.md:51-56`。

**边界**：这条只在"同一变体层"成立。普通类之间、`hover:` 之间、`md:` 之间各自比较；跨层时变体永远赢。

### 3.2 变体顺序

固定顺序：`hover:` 在 `active:` 之前，`max-*` 宽的在前，断点升序，`dark:` 最后；一个类带更多变体时排在后。同一个断点内，才轮到字符串顺序。

依据：`tailwind.md:68-69`；`tailwind/mod.rs` 顶部注释。

**后果**：

```text
class="size-9 w-auto md:size-8"
  → <768: w-auto（普通，靠后）生效
  → ≥768: md:size-8 是变体，晚于普通类，永远赢
```

真实的 Tailwind 编译产物也是这个顺序：`.w-auto` 在输出前部，`.md\:size-8` 在后部的媒体块里。

**规则**：覆盖带断点的槽类，必须带同样的断点前缀；覆盖 `hover:` / `active:` 状态色，也要带同样的变体。

### 3.3 没有 tailwind-merge

组件把调用方 `className` 追加在最后，靠"后写者赢"覆盖；不做冲突去重。调用方写 `w-[300px]` 能覆盖普通 `w-40`，但写 `w-[300px]` 覆盖不了 `md:w-40`。这是 API 使用约束，不是样式错误。

### 3.4 `style` > `class`，长写 > 简写

内联 `style` 的键同名 CSS 属性，覆盖类里的同一属性；同一对象里更具体的键（`paddingLeft` > `paddingHorizontal` > `padding`，`flexGrow` > `flex`）优先，与书写顺序无关。依据：`styling.md:93-95`。

### 3.5 断点是窗口宽度，不是容器

`sm:` / `md:` / `lg:` 比较的是应用窗口（surface）宽度，不是组件宽度；没有 container query。依据：`tailwind.md:154`。

**规则**：不能按组件自身宽度做响应式；同一断点下，同一个类在大窗口里按 `md:` 渲染，即使组件只占 300 宽。

### 3.6 未知类不重解释

NSH 支持的类集合是 Tailwind 4 中有原生含义的那部分；`peer-*`、`before:` / `after:`、任意属性 `[mask-type:...]`、以及没有原生含义的工具类都会被报告为 unknown class，**不会**被赋予别的含义。渲染提示（`antialiased`、`will-change-*`、`appearance-none`、`box-border`）接受但无效果。

依据：`tailwind.md:167-169`。

### 3.7 变体映射：有什么、没什么

| CSS / Tailwind | NSH |
|---|---|
| `hover:` / `active:` / `focus:` / `focus-within:` / `disabled:` / `enabled:` | 有 |
| `focus-visible:` | 0.5 起只随键盘焦点（按下/点击后不生效）；任意焦点用 `focus:`。View 点击不聚焦，视图上两者仍重合；自绘 ring 时保留 `modality` |
| `selected:` / `checked:` / `indeterminate:` / `aria-expanded:` / `aria-pressed:` / `aria-busy:` / `aria-checked:` / `aria-selected:` | 有（映射 `accessibilityState`） |
| `data-<name>:`（布尔形式） | 有；`data-[state=open]:` 这种值形式没有 |
| `group-*` / `group-<name>-*` | 有 |
| `first:` / `last:` / `odd:` / `even:` / `only:` | 有 |
| `nth-*` | 没有 |
| `peer-*` | 没有 |
| `before:` / `after:` | 没有（伪元素不存在） |
| `dark:` | 有（系统外观）；子树 `data-theme` 没有 |
| `sm:` … `2xl:` / `max-*:` / `min-[..]:` | 有（窗口宽度） |
| `portrait:` / `landscape:` / `ios:` / `android:` / `web:` / `rtl:` / `ltr:` / `terminal:` | 有（NSH 扩展） |
| `motion-safe:` / `motion-reduce:` | 有 |
| `(pointer: coarse)` / `(pointer: fine)` | `pointer-coarse:` / `pointer-fine:`（0.5 扩展） |
| `@media (hover: none)` / `print` / `prefers-contrast` / `forced-colors` | 没有 |
| `@container` | 没有 |

### 3.8 值与函数

- **任意值**：`w-[72px]`、`bg-[#34c759]`、`grid-cols-[1fr_auto]`、`bg-[color-mix(...)]` 都按 CSS 值解析；`p-[env(safe-area-inset-top)]` 这类环境变量只支持在 padding / margin；`calc()` 可用于任意长度值（`w-[calc(100%-1rem)]`），但 `rounded-*` 的简写不吃 `calc()`。
- **颜色**：hex、`rgb()`、`hsl()`、`oklch()` / `oklab()`、命名色、`currentColor`、`color-mix()`；透明度修饰符 `bg-black/40` 支持。
- **主题变量**：`bg-(--primary)` / `rounded-(--radius)` 是 Tailwind 4 的变量简写，NSH 支持；没有运行时 CSS 变量级联（§8.2）。
- **`!` 重要**：`!p-0` 提升优先级；没有 CSS 的 `!important` 级联，只有这个前缀（`tailwind.md:70`）。
- **动态类**：`class` 可以是运行时拼接的字符串（`bg-${color()}-500`），在核心里解析并缓存；构建期的 unknown-class 检查只看字面量，`tv()` 产物要靠全变体挂载测试兜底。
- **`classList`**：在 `class` 之后应用，值为真时生效；同层冲突仍然是后写者赢。
- **`style`**：一个对象或数组，按顺序合并成一个；更具体的键（`paddingLeft` > `padding`）优先，与书写顺序无关。

### 3.9 0.5 修正的行为（不必再登记为差异）

- **`focus-within` 更稳**：焦点在控件内部移动时的短暂 blur 不再立刻丢掉 `focus-within`。
- **`scrollbar={false}`**：桌面同时隐藏横向指示器。
- **收缩尺寸的 flex 行/列**把内容算进尺寸，含 slot holder 占位。
- **非法动画参数 settle**，不再产出 `NaN`；布局 spring 改为物理曲线。
- **`Link` 默认手型光标**；任意值与 token 的文本色支持透明度修饰符（`text-black/40` 等）。
- **类集合新增** `pointer-fine:` / `pointer-coarse:` / `terminal:`（见 §3.7）。

---

## 4. 行内布局与结构选择器

### 4.1 没有行内格式化上下文

CSS 的 `<span>` / `inline-flex` 可以和文字同排、随段落断行；NSH 的父容器要么是 flex、要么是 grid、要么是 block，没有 inline formatting context。`inline` / `inline-block` 在 flex / grid 父容器里与浏览器一样被 blockify（浏览器也这么做），但放进 block 容器或文字流里就不一样。

依据：`docs/dev/styles.md:56-58`；`tailwind.md:158`。

**规则**：行内级组件不能和前后文字同排、随段落断行；这类场景要改写结构（一行一个容器），或接受差异。

### 4.2 行内级根与 `w-fit`

上游 `inline-flex` 的根默认收缩到内容宽；NSH 里在列父容器会被拉伸到父宽（默认 `align-items: stretch`）。

**规则**：`inline-flex` 的根，如果上游依赖收缩宽度，就补 `w-fit`；如果它本来就该铺满，保持现状并登记。判断依据是上游该部件在普通块级父容器里的宽度，而不是它在 flex 行里的宽度。

### 4.3 伪元素

`::before` / `::after` 没有对应物，必须变成真实子 View。

常见改写：分隔线、扫光、光标、选中指示点、箭头、进度填充、滑块端帽、滚动阴影。

**代价**：布局多一层、`z-index` / `pointer-events` 要自己安排；调用方无法再用 `[&::before]` 定制。

### 4.4 `:has()`

没有。上游用 `:has()` 的地方只能：
- 改成子部件登记（例如"有图标时改内边距"、"有某个子部件时改对齐"）；
- 或放弃聚合行为（例如"多个子项共享一条动画"）。

### 4.5 后代选择器与子选择器

没有 `& > *` / `.a .b`。上游的后代规则改由：
- context 下发（组、字段、列表）；
- 子部件登记（首尾、图标计数、cell）；
- 或在部件自己的类串里写死。

**Space / divide**：`space-x-*` / `space-y-*` 有；`divide-*` 没有（需要子选择器）。`divide` 要换成真实分隔线。

### 4.6 `first/last/odd/even/only` vs `nth-*`

`first:` / `last:` / `odd:` / `even:` / `only:` 有，能做圆角、分隔线、边框的端点；`nth-*` 没有。带首尾圆角的组、带分隔线的列表都靠前者。

### 4.7 `display: contents`

没有。透明包装盒会变成真实布局盒；移植时要么多一层，要么把类直接放到子节点。

---

## 5. 盒模型与绘制

### 5.1 边框

- 宽度、颜色、每边、逻辑边（`border-s` / `border-e`）都有。
- **边框样式总是 solid**；`border-dashed` / `border-dotted` 没有。
- 没有边框颜色时取文字色（CSS 的 `currentColor`）。
- 默认主题的 `--border-width-field` 是 0，字段类组件按 `border-0` 写死；主题改这个 token 时组件不跟随。

### 5.2 圆角

- `rounded-*` 取自主题的 `radius` 刻度；超过边长一半会被 clamp，和 CSS 一致。
- 类里不能写 `calc()`；上游的 `min(32px, calc(var(--radius) * 2.5))` 只能落成固定值（20 / 22 / 24 这类）。主题改 `radius` 时这些固定值不跟随。
- `borderCurve: continuous` 是 NSH 扩展（iOS），CSS 无对应。

### 5.3 阴影与 ring

- `box-shadow` 支持多层、inset、spread；阴影跟随圆角。
- 暗色不能只靠一个 token 切换，要写 `shadow-* dark:shadow-*-dark`。
- `ring-*` 支持，焦点环通常用 `ring-2 ring-focus ring-offset-2`；`ring-inset` 用于组内按钮。
- 上游 `status-focused` 的 ring offset 读 `--ring-offset-width`，与主题一致。

### 5.4 overflow 两轴

`overflow-x-hidden` / `overflow-y-hidden` 都会裁两轴（`tailwind.md:160`）；`overflow-clip` 等同 hidden。**滚动不是 CSS overflow**：要滚动就用 `Scroll` 元素，它有自己的滚动条与物理。

**规则**：上游只裁一轴的容器，在 NSH 里要么换成 Scroll，要么接受两轴都裁。

### 5.5 滚动条与滚动行为

`scrollbar` / `scrollbar-none` 不是类；`Scroll` 有 `scrollbar` 属性，主题有 `scrollbar-*` token。浮层需要隐藏滚动条时，用 Scroll 的属性，不要找类。

**没有** `scroll-margin` / `scroll-padding` / `scroll-behavior` / `scrollbar-gutter` 这些类或样式键。键盘导航把列表项滚进视口时，落点与 CSS 的 `scroll-padding` 不同；需要留边距就在列表内容上加 padding。

### 5.6 背景、渐变、状态色

- 渐变（linear / radial / conic）、`from-*` / `via-*` / `to-*` 支持。
- **状态背景压过渐变**：在 CSS 里渐变画在 `background-color` 之上，`hover:bg-*` 看不见；NSH 里状态背景会替换渐变（除非状态自己也设渐变）。依据：`tailwind.md:165`。
- **`background-image: url(...)` 不支持**：`backgroundImage` 只接受渐变（`styling.md:228-246`）；图片用 `<Image>`（或图片画布）而不是 CSS 背景。
- `object-fit` / `object-position` 有（图片元素）；`maskImage` 支持渐变作为 alpha 遮罩。
- `background-clip`、`border-image`、`box-decoration-break` 没有。

### 5.7 滤镜与混合

- `filter` / `backdrop-filter` / `mix-blend-mode` 支持，但有平台差异：Linux 与 GPUI 不画滤镜，GPUI 只画正常混合；Windows 会画（`styling.md:293`）。
- `glassEffect` 是 iOS 26 / macOS 26 的扩展，其他平台退回 `backdropFilter`。
- 浮层的 `backdrop-blur` 在 Windows / 无头可能退化为纯遮罩，实机再确认。

### 5.8 outline

`outlineWidth` / `outlineColor` / `outlineStyle` / `outlineOffset` 都有，`outline-none` 有。焦点环用 ring 或 outline 都行；NSH 没有浏览器 UA 的默认 outline，`outline-none` 主要是显式归零。

### 5.9 position / sticky / fixed / z-index

- `relative` 默认。
- `absolute` 相对最近的 positioned 祖先。
- **`absolute` 不保留静态位置**：没有 `top/right/bottom/left` 时，视图落在包含块的起点（实测是 padding 之后的 `(16,16)`），而不是 CSS 里"本来应该出现的位置"（那会是前一个兄弟之后）。原来靠静态位置居中的绝对子项（光标、箭头、指示点）必须显式写 `top` / `left` / `translate`。
- `fixed` 相对根视图布局，浮在所有子节点之上；不是浏览器视口的 `fixed`。
- `sticky` 支持：在滚动视图里按 `top` / `left` 吸附到视口，直到父级内容盒结束（`style.rs:1535`）。
- 同级按文档顺序绘制，`zIndex` 改变顺序；没有 `isolation: isolate`，ring / 阴影的堆叠要自己安排。

### 5.10 没有对应物的绘制属性

- `contain`
- `isolation`
- `display: contents`
- `clip-path`、`background-clip`、`box-decoration-break`
- `touch-action`、`overscroll-behavior`、`scroll-snap` 类（Sheet 的 snap 由原语负责）
- `float` / `clear` / 多栏
- `order`（flex 重排只能改源码顺序或登记）
- `mix-blend-mode` 在 GPUI 只按 normal 画

### 5.11 交互相关样式

| 属性 | NSH |
|---|---|
| `pointer-events` | 有；`box-none` / `box-only` 是 NSH 扩展（只对视图自身生效，子视图仍可命中） |
| `cursor` | 有；`cursor-[inherit]` 没有，`cursor-pointer` / `not-allowed` 等常规值有 |
| `user-select` | 有（`select-none` / `select-text` / `select-all`）；文本还要 `selectable` 才能选中复制 |
| `opacity` | 有；`opacity-*` |
| `visibility` | `invisible` 隐藏视图及其子树；`visible` 恢复 |
| `display: none` | `hidden` 类；不占布局 |
| `caret-color` | 有（`caret-*`），输入类部件用它关掉原生光标 |
| `appearance` | 无效果（渲染提示，接受不改） |

### 5.12 变换

- `translate-*`（百分比相对自身）、`scale-*`、`rotate-*`、`skew-*`、`transform-origin`（`origin-*`）都有；变换是绘制层的，不改变布局盒。
- `transition` 可以动变换；`transform-gpu`、`will-change-transform` 是接受但无效果的渲染提示。
- 变换后的命中区域按变换后的形状算，和 CSS 的 `transform` 一致；绝对定位的居中常用 `-translate-x-1/2` / `-translate-y-1/2`，不要依赖静态位置。
- 3D 透视、backface 等没有通用类；需要时用样式键，先在小范围验证。

---

## 6. 过渡与动画

### 6.1 一组时长、一条曲线

NSH 的 `transition` 是一个属性列表 + 一个 duration + 一个 curve；不能像 CSS 那样给每个属性不同的时长/曲线。

依据：`tailwind.md:163`；`docs/dev/styles.md:302`。

**规则**：上游"背景 150ms + 阴影 100ms"这类组合只能合并成一条；视觉差在 50–150ms 级，截图基线不一定抓得住，靠审查登记。

### 6.2 属性组

`transition` 动颜色、透明度、阴影、变换；`transition-all` 还动圆角和边框宽度；滤镜、背景滤镜、渐变、布局属性立即生效。

**规则**：宽度/高度/位置不参与 CSS transition。进度条的宽度、指示条的位移要用 `LayoutAnimation` 或原生动画。

### 6.3 自定义 keyframes

内置只有 `animate-spin` / `ping` / `pulse` / `bounce`；扫光、字符入场、不确定态进度、高度展开都要写成原生动画或 `reveal`。

### 6.4 布局动画

高度展开有两类实现：
- 有原生 `reveal` 的容器：弹簧高度，内容可 `keepMounted`；
- 普通容器：高度瞬变。

**规则**：上游用 `height` transition 的面板，如果宿主的可折叠容器不支持 `keepMounted`，就只能接受瞬变或换容器；这不是改一行类能解决的。

### 6.5 reduced motion

`motion-reduce:` 有；但组件自己的原生动效要手动读 `reduceMotion()`。自定义扫光、循环动画、脉冲在减少动效时应当停；`animate-pulse` 这类内置动画也不会自动停，要显式 `motion-reduce:animate-none`。

---

## 7. 文字与排版

### 7.1 Text 是唯一出口

裸字符串放在 View 里不渲染；每个字符串都要包进 `Text`。这不是 CSS 差异，但移植时最常见的"看起来没渲染"原因。

### 7.2 文字样式从 View 继承

View 上的 `text-*` / `font-*` / `leading-*` / `tracking-*` 会传给内部的 Text 和 Input，像 CSS 继承。依据：`tailwind.md:159`。

### 7.3 默认值与字号缩放

Text 默认黑色、14pt、400；`font-sans` 是应用字体，`font-mono` 落到系统等宽。`allowFontScaling` 默认 true，文字跟随系统字号缩放；浏览器不跟随，属于平台差异。

### 7.4 lineHeight 的数字是点

CSS 的 `line-height: 1.5` 是倍数；NSH 的 `lineHeight: 1.5` 是 1.5 点，倍数要写 `"150%"` / `"1.5"` 字符串。类 `leading-*` 走 Tailwind 刻度，没有这个问题。依据：`styling.md:176`；`docs/dev/styles.md:22`。

### 7.5 断行与空白

Web 目标用 Rust 排版，字宽用浏览器 `measureText`；换行是 UAX #14 的子集，行高与基线由 NSH 算。多行文本与 Chrome 可能有 1px 级差异（截图阈值处理）。Windows 用 DirectWrite，差异更大，只做人工抽检。

**空白保留**：NSH 的 Text 把字符串里的空格与换行按原样画（`tailwind.md:161`）；CSS 默认 `white-space: normal` 会折叠。JSX 字面量的空白由编译器按 JSX 规则折叠。因此多行模板字符串、缩进过的文本在 NSH 里会多出空格/换行，必要时在源码里写成单行或显式 `whitespace-*`。

### 7.6 文本装饰、变换与截断

| 特性 | NSH |
|---|---|
| `text-align`（left / center / right / start / end / justify） | 有 |
| `text-decoration`（underline / line-through / no-underline） | 有；`decoration-*`（颜色）、`decoration-[1.5px]`（粗细）、`underline-offset-*` 有 |
| `text-transform`（uppercase / lowercase / capitalize） | 有 |
| `text-overflow: ellipsis` | 有；`truncate` = 单行 + 尾部省略 |
| `line-clamp-*` | 映射为 `numberOfLines`；`line-clamp-none` 恢复 |
| 省略位置 | `ellipsis-start` / `ellipsis-middle` 是 NSH 扩展，CSS 没有 |
| `text-shadow` | 有（样式键 / 类），多层阴影按最宽的一层画 |
| `vertical-align` | 有（样式键 / 对齐类），但行内替换元素的基线行为与浏览器不同 |
| `word-spacing` / `hyphens` | 没有 |
| `text-wrap: balance / pretty` | 类接受，没有平衡效果 |
| `wrap-break-word` / `overflow-wrap` / `word-break` | 没有；长单词会溢出 |
| `list-style` / `::marker` | 没有；列表样式无法作用于原生 HTML 标签 |
| `writing-mode` | 没有；有 `direction` / `writingDirection` |
| `::placeholder` | 有（`placeholder:text-*` / `placeholderColor`） |
| `::selection` | 只支持背景色（`selection:bg-*`），不支持选中文字颜色 |
| `caret-color` | 有（`caret-*` / `caretColor`） |

### 7.7 字体来源

`font-sans` 是应用主题里的字体，`font-mono` 落到系统等宽；字体是应用打包的资产，不是 CSS `@font-face`。没有 `font-feature-settings` 的通用通道，只有数字形式（`tabular-nums` / `normal-nums`）；`font-weight` / `italic` / `letter-spacing` / `leading` 走常规类。

### 7.8 选择与复制

文本要 `selectable` 才能选择/复制；默认不是可选。

---

## 8. 单位、主题与平台

### 8.1 点是单位，不是像素

`p-4` 是 16 点；`p-[13px]` 也是 13 点（类里的 `px` 当点用）；`rem` = 16 点。100% 缩放下与 CSS 像素 1:1，高 DPI 下按 DIP 放大。依据：`tailwind.md:158`。

`em` / `ch` 在任意值里按 CSS 解析，但"随字号缩放"的场景不可靠：`size-[0.75em]` 这类图标尺寸在移植里落成固定 12pt，字号变了图标不跟。需要联动就按字号自己算，或用主题 token。

### 8.2 token 展开，没有 CSS 变量级联

上游用 `--x` / `--x-hover` 这类自定义属性做"基础值 → 变体改值 → 复合规则"的级联；NSH 没有 CSS 变量，必须在 tv 表里展开成 `bg-*` / `text-*` 与 `compoundVariants`。

**代价**：变量不再暴露给调用方；主题改一个变量不会自动改所有派生值。

### 8.3 没有子树主题

`data-theme` 切局部主题不支持；主题是应用的 `nsh.json` + `theme` 文件，全局。

### 8.4 dark

`dark:` 跟系统外观；颜色 token 自带明暗两值。阴影不能随 `dark:` 自动切换，要写 `dark:shadow-*-dark`；透明/无阴影的变体也要补 `dark:shadow-none`。

### 8.5 平台差异

- Windows：Direct2D / DirectWrite，字体与阴影栅格化与 Chrome 不同，只做人工抽检；非 Input 视图拿不到键盘焦点（host 缺口）。
- Web：HTML 渲染，文字由 Rust 排版后逐段绘制。
- 滤镜：Linux / GPUI 不画；GPUI 只画正常混合。
- `backdrop-filter`：iOS/macOS/Android 是 blur，web/Windows 是全套，Linux/GPUI 没有。
- 安全区：`env(safe-area-inset-*)` 只支持在 padding/margin 的类里。

### 8.6 媒体能力

只有窗口断点、横竖屏、平台、明暗、reduced motion；没有 `hover: none` / `pointer: coarse` / `print` / `prefers-contrast` / `forced-colors` / container query。

---

## 9. 一页速查表

| CSS / Tailwind | NSH | 规则 |
|---|---|---|
| 块级流式容器 | 默认 flex 列 | 显式写方向 |
| `flex: 1 1 0%` | `flex-1` 是 `1 1 0`（零长度） | 内容驱动的容器用 `flex-auto` / `basis-auto` |
| `min-height: auto` | 有类；交叉轴不撑父级 | 不要依赖 |
| 普通类覆盖 `md:` 槽类 | 断点变体最后生效 | 覆盖类带 `md:` |
| 调用方 `className` 覆盖 | 同类层后写者赢 | 覆盖状态色带 `hover:` 等 |
| `inline-flex` 根 | 块级化，列里拉伸 | `w-fit` |
| `grid-template-areas` / `grid-area` | 无 | 显式行列线 |
| `background-image: url()` | 无（只支持渐变） | 用 Image |
| `absolute` 无 inset | 落在包含块起点，无静态位置 | 显式 top/left/translate |
| `pointer-events` / `cursor` / `user-select` | 有（box-none / box-only 扩展） | 常规使用 |
| 逻辑属性 `ps/me/start/border-s` | 按方向 | RTL 下检查 |
| `::before` / `::after` | 无 | 真实子 View |
| `:has()` | 无 | 登记 / 子部件登记 |
| 后代选择器 | 无 | context / 登记 |
| `divide-*` | 无 | 真实分隔线 |
| `display: contents` | 无 | 多一层 / 类下放 |
| `order` | 无 | 源码顺序 |
| `overflow-x` 单独裁 | 两轴都裁 | Scroll / 接受 |
| `overflow: auto` 滚动 | Scroll 元素 | 用 Scroll |
| 每属性 transition | 一组时长/曲线 | 合并 / 登记 |
| 布局 transition | 不参与 | LayoutAnimation / reveal |
| 自定义 keyframes | 只有四个预设 | 原生动画 + `reduceMotion()` |
| `focus-visible` | 0.5 起只随键盘；任意焦点用 `focus` | 自绘 ring 时保留 modality |
| `outline` | 有；焦点环常用 ring | ring + modality |
| `currentColor` 图标 | IconCanvas 不继承 | 显式 color |
| `text-wrap: balance` | 接受无效果 | 登记 |
| `overflow-wrap` | 无 | 登记 / 接受溢出 |
| `lineHeight: 1.5` | 1.5 点 | 用类或字符串 |
| CSS 变量级联 | 无，token 展开 | tv compound |
| 子树 `data-theme` | 无 | 全局主题 |
| container query | 无 | 窗口断点 |
| `(pointer: coarse)` / `(pointer: fine)` | pointer-coarse: / pointer-fine: | 0.5 扩展 |
| `(hover: none)` / `print` / `forced-colors` | 无 | 登记 |

---

## 10. 移植检查表

移植一个上游组件时，按顺序问：

1. 它的根是块级、行内级还是行？NSH 的 View 默认列，方向写了吗？
2. CSS 里有 `flex-1` 吗？所在容器的高度是内容驱动还是固定？→ 内容驱动就 `flex-auto` / `basis-auto`。
3. 有没有"后续普通类覆盖前面 `md:` / `sm:` 类"的写法？→ 覆盖类带同样的断点。
4. 有没有行内级根（`inline-flex` / `inline-block`）？→ 考虑 `w-fit`。
5. 有没有 `::before` / `::after`？→ 真实子 View，并安排 `pointer-events` / `z-index`。
6. 有没有 `:has()` / 后代选择器 / `:first-child` / `:last-child`？→ 子部件登记或 context；`first:` / `last:` 可用。
7. 有没有 `space-x` / `divide`？→ `space-*` 可用；`divide` 换成真实分隔线。
8. 有没有 CSS 变量做变体级联？→ tv 的 `compoundVariants`，检查版本 4.0.1 的 `class` 形状。
9. 有没有 `overflow-x` / `overflow-y` 单独裁？→ 两轴都裁，滚动换 Scroll。
10. 有没有布局 transition（宽/高）？→ LayoutAnimation / reveal，或登记差异。
11. 有没有每个属性不同时长的 transition？→ 选一个，登记其余。
12. 有没有 `focus-visible` / `outline`？→ ring + `focus:` / `focus-visible:`；自绘 ring 时才用 modality。
13. 有没有图标依赖 `currentColor`？→ 显式 color。
14. 有没有 `text-wrap` / `overflow-wrap` / list marker？→ 登记或接受。
15. 有没有 `@media (hover: none)` / `@container` / `forced-colors`？→ 没有对应物，登记。
16. 有没有 `border-dashed` / `display: contents` / `order` / `isolation` / `contain`？→ 没有对应物，结构改写或登记。
17. 有没有 `grid-template-areas` / `grid-area`？→ 改成显式行列线。
18. 有没有不带 inset 的 `absolute` 子项？→ 显式 `top` / `left` / `translate`，不要依赖静态位置。
19. 有没有 `truncate` / `line-clamp` / `text-decoration` / `text-transform`？→ 都有映射，按 §7.6 对照。
20. 有没有 `url()` 背景图、`background-clip`、`border-image`？→ 用 Image / 结构改写。
21. 有没有逻辑属性与 RTL 图标？→ 按 §1.8 检查翻转。

---

## 11. 证据与复现

### 11.1 文档

- `tmp/vendor/nsh-src/website/docs/layout.md:18-25`：默认值表；`:70` flex 简写；`:92` min-h-auto；`:102` min/max。
- `tmp/vendor/nsh-src/website/docs/tailwind.md:66-70`：冲突规则；`:97-100` 变体与断点；`:156-169` 与 Web/Tailwind 的差异。
- `tmp/vendor/nsh-src/website/docs/styling.md:109-115`：默认值；`:163` 过渡；`:263-293` 滤镜/混合；`:176` lineHeight。
- `tmp/vendor/nsh-src/docs/dev/styles.md:41-58`：CSS 含义、Yoga 默认、类排序、无行内格式化上下文。
- `tmp/vendor/nsh-src/crates/nsh-core/src/style.rs:1434-1450`：默认 Style；`:1535` position/sticky；`:2780` flex 解析。
- `tmp/vendor/nsh-src/crates/nsh-core/src/tailwind/utilities.rs:1468`：`flex-1`；`:1476` `flex-auto`；`:2043` `size`；`:2052` `w`。
- `tmp/vendor/nsh-src/crates/nsh-core/src/tailwind/mod.rs`：类求值顺序的模块注释。
- 上游 issue：`https://github.com/DioxusLabs/taffy/issues/351`（§9.9.2 Intrinsic Cross Sizes 未完成）。

### 11.2 纯样式复现

- `tmp/issue-minh/`：无组件、无文本的纯盒模型；`App.tsx`、`matrix.tsx`、纯 CSS 基线、英文 issue 草稿、README。
- `tmp/repro-app/flexlab.tsx`：列 vs 行、`flex-1` / `min-h-auto` / `flex-auto` / `basis-auto` 的矩阵。
- `tmp/repro-app/wrap-minh.tsx`：短文本与换行文本在列父级里的对照。
- `tmp/repro-app/abslab.tsx`：不带 inset 的 `absolute` 落点（实测 `(16,16)`，不是静态位置）。
- `tmp/reference-static/`：`@heroui/styles` 3.2.7 的真实编译产物 + 手工 DOM 基线，README 写了生成方式。

### 11.3 截图

- `/tmp/opencode/minh-min.png`：NSH 的纯盒模型溢出。
- `/tmp/opencode/chrome-min.png`：同一几何在 Chrome 里的正确结果。
- `/tmp/opencode/upstream-reference.png`：上游编译基线的样式对照。

### 11.4 运行

```sh
cd tmp/issue-minh
nsh test --target web min.web.test.tsx
nsh test min.headless.test.tsx
nsh test --target web matrix.web.test.tsx

/usr/bin/google-chrome --headless=new --disable-gpu --no-sandbox \
  --virtual-time-budget=1500 --dump-dom file://$PWD/baseline-min.html

cd ../repro-app
nsh test --target web flexlab.web.test.tsx
```

---

## 12. 维护方式

- 这份清单是**样式规则**，不是组件清单；组件实现按这些规则逐项对照，不在本文里点名。
- NSH 升级时先重跑 §11 的复现，确认差异是否变化（尤其是 Taffy 的交叉轴测量与 `flex-1` 的 basis 单位）。
- 每个组件的移植文档 §8 至少引用本清单的一节（例如 "§2.5"、"§3.2"、"§4.2"、"§6.1"），避免同类差异散落。
- 上游 docs issue 建议：在 `website/docs/tailwind.md` 或 `layout.md` 增加一节 "Porting CSS/Tailwind"，把 §2.5、§3.2、§4.2、§6.1 四条规则写死；`min-h-auto` 的 "as on the web" 需要限定交叉轴。
