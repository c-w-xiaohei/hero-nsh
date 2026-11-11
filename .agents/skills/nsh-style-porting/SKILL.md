---
name: nsh-style-porting
description: 'Use when porting CSS or Tailwind UI (including HeroUI) to NSH, reviewing NSH style code for CSS fidelity, or diagnosing layout/style mismatches such as flex-1 collapse, min-h-auto, inline-flex stretching, breakpoint override order, pseudo-element rewrites, absolute positioning, grid-template-areas, or NSH-vs-CSS differences. Triggers: "NSH 样式移植", "CSS 到 NSH", "flex-1 塌陷", "min-h-auto", "md: 覆盖", "inline-flex 拉伸", "nsh style deltas".'
---

# NSH Style Porting

版本锚点：NSH 0.4.0、Taffy 0.15.0。规则来自 0.4.0 的文档、源码与实测；升级 NSH 后先重跑 `references/style-deltas.md` §11 的复现，确认差异是否变化。

这份 skill 只讲**样式规则**：布局、尺寸、类解析、绘制、动效、文字、单位与主题。API、DOM 属性、无障碍语义的差异不在这里，也不按具体组件名硬编码修法。

## 何时使用

- 把上游 CSS / Tailwind 组件移植到 NSH，需要判断某个写法在 NSH 里是否等价。
- 审查 NSH 样式代码的 CSS 保真度，尤其是布局、断点、伪元素、动效。
- 诊断"看起来对了但实际不对"的样式问题：塌陷、拉伸、溢出、层级、时长。

不适用：纯 API 兼容、DOM 属性、读屏语义；这些走各组件自己的移植文档。

## 十条核心规则

1. **View 默认是列**，`flex` 才是行；`flexShrink` 默认 0，最小宽高默认 0（CSS 是 1 / auto）。
2. **`flex-1` 的 basis 是零长度，不是零百分比**：NSH 存 `1 1 0`，Tailwind 的 `flex-1` 是 `1 1 0%`。未定高容器里 `0%` 按内容解析，`0` 是确定的零，所以 NSH 更容易塌。内容驱动的容器一律 `flex-auto` / `basis-auto`。
3. **交叉轴测量不看 automatic minimum**：行里一个高度 auto 的列，列高按子项 flex basis 求和；`min-h-auto` 只让子项自己长高，父级不涨。不要用 `min-h-auto` 当补丁。
4. **类串不是级联**：同类层后写者赢；变体（含断点）永远晚于普通类。覆盖带 `md:` 的槽类，必须自己带 `md:`。
5. **没有行内格式化上下文**：`inline-flex` 在块级父容器里会被当成块，通常要补 `w-fit`。
6. **没有伪元素、`:has()`、后代/子选择器**：分隔线、扫光、箭头、指示点要变成真实子视图；后代样式改由 context 或登记实现。
7. **过渡只有一组时长/曲线**：多属性不同时长只能合并；布局属性（宽高）不参与 CSS transition，用 `LayoutAnimation` / `reveal`。
8. **`overflow-x-hidden` 同时裁两轴**；滚动是 `Scroll` 元素，不是 CSS `overflow: auto`。
9. **文字必须落在 `Text` 里**；View 上的 `text-*` / `font-*` 会继承给内部 Text；`lineHeight` 的数字是点，不是倍数。
10. **没有 CSS 变量级联、没有子树主题、没有 container query**；断点是窗口宽度。

## 工作流

1. 在上游 CSS / Tailwind 里找出实际生效的声明：display、flex、尺寸、定位、overflow、transition、伪元素、后代选择器。
2. 先查下面的快速决策表。命中就按规则改，不要先写代码再试。
3. 没命中，或有歧义，读 `references/style-deltas.md` 的对应小节：§1 布局默认值、§2 内在尺寸与 flex basis、§3 类解析、§4 行内与结构选择器、§5 盒模型与绘制、§6 动效、§7 文字、§8 单位/主题。
4. 属于宿主能力差异（伪元素、`:has()`、container query、container 样式、滤镜平台限制等）就登记差异，不要硬造一个近似实现冒充 1:1。
5. 用 `onLayout` 几何、`nsh test --target web` 截图、或同一个 Chrome 的 CSS 基线验证；不要只凭肉眼。

## 快速决策表

| 上游写法 | NSH 规则 |
|---|---|
| `flex: 1` 在内容驱动的容器里 | 改 `flex-auto` / `flex-1 basis-auto`；不要用 `min-h-auto` |
| 行里的自适应高度列 + `flex-1` | 交叉轴会塌；同上，或给行 `items-stretch`（代价是等高） |
| 普通类覆盖前面的 `md:` / `sm:` 槽类 | 覆盖类带同样的断点前缀 |
| 调用方 `className` 覆盖状态色 | 带同样的 `hover:` / `active:` 变体 |
| `inline-flex` 根 | 块级化；补 `w-fit` 或接受铺满 |
| `::before` / `::after` | 真实子 View；安排 `pointer-events` / `z-index` |
| `:has()` / 后代选择器 / `:first-child` | 子部件登记或 context；`first:` / `last:` 可用 |
| `divide-*` | 真实分隔线；`space-*` 可用 |
| `display: contents` | 没有；多一层或把类下放 |
| `order` | 没有；改源码顺序或登记 |
| `overflow-x` / `overflow-y` 单独裁 | 两轴都裁；滚动换 `Scroll` |
| 每属性不同 transition | 合并成一组时长/曲线，登记其余 |
| 宽/高 transition | 不参与；`LayoutAnimation` / `reveal` |
| 自定义 keyframes | 只有 spin/ping/pulse/bounce；其余原生动画 + `reduceMotion()` |
| `focus-visible` | 等于 `focus`；用 modality 追踪键盘来源 |
| `lineHeight: 1.5` | 1.5 点；倍数写 `"150%"` / `"1.5"` |
| `grid-template-areas` / `grid-area` | 没有；显式 `col-start` / `row-start` / `col-span` |
| 不带 inset 的 `absolute` | 落在包含块起点；显式 `top` / `left` / `translate` |
| `background-image: url()` | 不支持；用 `<Image>` |
| `text-wrap: balance` / `overflow-wrap` | 没有；登记或接受溢出 |
| `container query` / `(hover: none)` / `forced-colors` | 没有；登记 |
| CSS 变量做变体级联 | tv 的 `compoundVariants`，检查 4.0.1 的 `class` 形状 |

## 验证

```sh
# 几何：组件里挂 onLayout，把 bounds 写进 Storage，测试读回
nsh test --target web <test>.web.test.tsx

# 样式基线：同一个 Chrome 打开纯 CSS 复刻，量同一组盒子
google-chrome --headless=new --disable-gpu --no-sandbox \
  --window-size=1280,900 --dump-dom file://$PWD/baseline.html

# 构建期未知类检查（nsh check 只做类型检查，类检查在 build/dev）
nsh build <app>   # 或 nsh dev <app>
```

几何断言优先用比例或结构关系（`footer.y >= body.y + body.height`、`width >= 2 * height`），不要写死像素，避免字体与 DPR 造成误报。

## 参考

- `references/style-deltas.md`：完整差异清单，654 行；按 §1–§8 分类，含证据与实测矩阵。
- `references/porting-checklist.md`：21 条开工检查表 + 验证命令；移植一个组件前逐条过。

只在快速决策表无法判断时加载 `style-deltas.md`；做整组件审查或写法复盘时加载 `porting-checklist.md`。
