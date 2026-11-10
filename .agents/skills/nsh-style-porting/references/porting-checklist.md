# NSH 样式移植检查表

移植一个上游组件前逐条过；每条命中就去 `style-deltas.md` 的对应小节确认，不要凭记忆。

## 开工前 21 问

1. 它的根是块级、行内级还是行？NSH 的 View 默认列，方向写了吗？
2. CSS 里有 `flex-1` 吗？所在容器的高度是内容驱动还是固定？→ 内容驱动就 `flex-auto` / `basis-auto`。
3. 有没有"后续普通类覆盖前面 `md:` / `sm:` 类"的写法？→ 覆盖类带同样的断点。
4. 有没有行内级根（`inline-flex` / `inline-block`）？→ 考虑 `w-fit`。
5. 有没有 `::before` / `::after`？→ 真实子 View，并安排 `pointer-events` / `z-index`。
6. 有没有 `:has()` / 后代选择器 / `:first-child` / `:last-child`？→ 子部件登记或 context；`first:` / `last:` 可用。
7. 有没有 `space-x` / `divide`？→ `space-*` 可用；`divide` 换成真实分隔线。
8. 有没有 CSS 变量做变体级联？→ tv 的 `compoundVariants`，检查版本 4.0.1 的 `class` 形状。
9. 有没有 `overflow-x` / `overflow-y` 单独裁？→ 两轴都裁，滚动换 `Scroll`。
10. 有没有布局 transition（宽/高）？→ `LayoutAnimation` / `reveal`，或登记差异。
11. 有没有每个属性不同时长的 transition？→ 选一个，登记其余。
12. 有没有 `focus-visible` / `outline`？→ ring + modality。
13. 有没有图标依赖 `currentColor`？→ 显式 color。
14. 有没有 `text-wrap` / `overflow-wrap` / list marker？→ 登记或接受。
15. 有没有 `@media (hover: none)` / `@container` / `forced-colors`？→ 没有对应物，登记。
16. 有没有 `border-dashed` / `display: contents` / `order` / `isolation` / `contain`？→ 没有对应物，结构改写或登记。
17. 有没有 `grid-template-areas` / `grid-area`？→ 改成显式行列线。
18. 有没有不带 inset 的 `absolute` 子项？→ 显式 `top` / `left` / `translate`，不要依赖静态位置。
19. 有没有 `truncate` / `line-clamp` / `text-decoration` / `text-transform`？→ 都有映射，按 `style-deltas.md` §7.6 对照。
20. 有没有 `url()` 背景图、`background-clip`、`border-image`？→ 用 Image / 结构改写。
21. 有没有逻辑属性与 RTL 图标？→ 按 `style-deltas.md` §1.8 检查翻转。

## 命中后的处置

| 情况 | 处置 |
|---|---|
| 有等价类或样式键 | 按规则直接改，不加近似层 |
| 宿主能力缺失（伪元素、`:has()`、container query、滤镜平台限制） | 在组件移植文档的 §8 登记，写清影响面与可接受性 |
| 只能近似（箭头、动效曲线、密度） | 登记"近似"并给出差异幅度，不要写成 1:1 |
| 不确定 | 先写纯盒模型复现，量 NSH 与 Chrome，再下结论 |

## 验证命令

```sh
# 几何：onLayout 把 bounds 写进 Storage，测试读回
nsh test --target web <test>.web.test.tsx

# 无头引擎（排除 web 后端因素）
nsh test <test>.headless.test.tsx

# 纯 CSS 基线：同一个 Chrome，量同一组盒子
google-chrome --headless=new --disable-gpu --no-sandbox \
  --window-size=1280,900 --dump-dom file://$PWD/baseline.html

# 类型检查；未知类检查在 build/dev
nsh check <app>
nsh build <app>
```

## 几何断言的最小集

- 卡片/面板：`footer.y >= body.y + body.height`，且 `body.height > 0`。
- 行内按钮：文字按钮 `width >= 2 * height`；图标按钮约 `1:1`。
- 断点：至少量 520 与 1024 / 1280 两个宽度，专门抓"普通类压不过 `md:`"。
- 固定高度容器：内容撑满、Footer 贴底；自动高度容器：父级包住全部子项。
- 行 vs 列、`items-start` vs `items-stretch` 各测一次；交叉轴问题只在非 stretch 的行里出现。

不要写死像素阈值；字体、DPR、平台字体会让绝对值漂移，结构关系才是稳定信号。
