import { expect, test } from "nsh/test";
import { openScenario } from "../../helpers/open-scenario";

/*
 * HeroUI 3.2.7 regression cases for Typography, per port sheet 4b
 * (T-001 … T-007). All of them run headless on the windows platform: the
 * component has no keyboard, pointer or focus behavior.
 *
 * Three cases are partial ports because NSH projects no class names or
 * data-* attributes (D18) and has no HTML element semantics: T-002 loses the
 * `data-slot` / `data-type` / BEM assertions, T-006 loses the `CODE` tag
 * name, T-007 loses the `data-slot` / BEM assertions. T-003 (arbitrary
 * `data-*` passthrough) is deleted by the port sheet: NSH has no arbitrary
 * attribute channel.
 *
 * The helper `spanStyle` sizes are points; `text-base` is 16, `text-sm` 14,
 * `text-3xl` 30. Colors resolve on the harness theme
 * (theme/hero-nsh.theme.json): light foreground `#18181bff`.
 */

// heroui/packages/react/tests/components/typography/typography.test.tsx:6
test("T-001 renders text content", async () => {
  const app = await openScenario("typography/basic");

  expect(app.shows("text:HeroUI Typography")).toBe(true);
});

// heroui/packages/react/tests/components/typography/typography.test.tsx:12
// Partial port (port sheet T-002): the `data-slot="typography"`,
// `data-type="body"` and `typography--body` assertions are dropped by D18.
// Their visible half is the default type: `text-base` resolves to 16 points.
// The line height (28) is not reported by spanStyle, so that half of the BEM
// rule has no query and is dropped.
test("T-002 exposes the default body appearance", async () => {
  const app = await openScenario("typography/body");

  expect(app.shows("text:Body copy")).toBe(true);
  expect(app.spanStyle("text:Body copy").fontSize).toBe(16);
});

// heroui/packages/react/tests/components/typography/typography.test.tsx:32
// Rewritten port (port sheet T-004): upstream queries `getByRole("heading",
// {level: 2, name})`. NSH has no h2 element, so the part maps `level` to
// `role="header"` + `accessibilityLevel`. `accessibilityLevel` has no test
// query, so the level is proven twice: the header role, and the size the same
// level derives (`text-3xl` = 30; a dropped level falls back to h1's 36).
test("T-004 renders the requested heading level", async () => {
  const app = await openScenario("typography/heading");

  expect(app.shows("role:header[Section title]")).toBe(true);
  expect(app.spanStyle("text:Section title").fontSize).toBe(30);
});

// heroui/packages/react/tests/components/typography/typography.test.tsx:40
// Rewritten port (port sheet T-005): the `typography--body-sm` class-name
// assertion becomes the visual effect that modifier stands for, `text-sm`
// resolving to 14 points. A dropped `size` falls back to `text-base` (16).
test("T-005 exposes the small paragraph size", async () => {
  const app = await openScenario("typography/paragraph");

  expect(app.spanStyle("text:Small copy").fontSize).toBe(14);
});

// heroui/packages/react/tests/components/typography/typography.test.tsx:54
// Partial port (port sheet T-006): the `tagName === "CODE"` assertion is
// dropped, because NSH has no code element and no code accessibility role.
// The visible half of `type="code"` is asserted: `text-sm` (14) plus the
// `bg-default` fill, which a body type does not have.
test("T-006 renders the code appearance", async () => {
  const app = await openScenario("typography/code");
  const style = app.spanStyle("text:const x = 1;");

  expect(style.fontSize).toBe(14);
  expect(style.backgroundColor).toBeDefined();
});

// heroui/packages/react/tests/components/typography/typography.test.tsx:62
// Partial port (port sheet T-007): the `data-slot="prose"` and
// `typography-prose` class-name assertions are dropped by D18. The visible
// effect unique to the prose slot is `text-foreground`, asserted through the
// resolved light-theme color; a dropped root class leaves the platform's
// default color. The scenario's bare string also proves Prose normalizes a
// string child into a Text instead of dropping it inside the root View.
test("T-007 exposes the prose appearance", async () => {
  const app = await openScenario("typography/prose");

  expect(app.shows("text:Prose content")).toBe(true);
  expect(app.spanStyle("text:Prose content").color).toBe("#18181bff");
});

/*
 * Regression X-001. Evidence:
 * src/components/typography/typography-root.tsx:218-220,245-248 /
 * src/components/typography/typography.styles.ts:95
 *
 * Upstream applies every variant class to the one element it renders, and the
 * stylesheet places `.typography--code` before `.typography--color-default` /
 * `.typography--color-muted`, so a resolved `color` overrides the code box's
 * own `text-foreground`. The port hard-coded `text-foreground` on the nested
 * code Text instead, which shadowed the root's muted color: the first four
 * muted cases below reported the foreground (#18181bff) before the fix. The
 * last case is the control, not a duplicate: a code that merely inherits a
 * muted paragraph must keep the code's own foreground rather than pick up the
 * parent color.
 */
test("X-001 lets a muted color reach an inline code box", async () => {
  const app = await openScenario("typography/code-color");
  const muted = "#71717aff";
  const foreground = "#18181bff";

  expect(app.spanStyle("text:Muted body control").color).toBe(muted);
  expect(app.spanStyle("text:Muted code span").color).toBe(muted);
  expect(app.spanStyle("text:Muted typed code").color).toBe(muted);
  expect(app.spanStyle("text:Muted nested code").color).toBe(muted);
  expect(app.spanStyle("text:Inherited code").color).toBe(foreground);
});

/*
 * Regression X-005. Evidence:
 * src/components/typography/typography-root.tsx:211-230,263-275,301-312
 * heroui/packages/styles/components/typography.css:117-119,149-163
 * heroui/packages/styles/src/components/typography/typography.styles.ts:41-46
 *
 * Upstream resolves the whole variant table on the one `<code>` element: the
 * weight utilities land next to `.typography--code`, and the code class sets
 * no font weight of its own, so the utility is what paints the glyphs bold.
 * The port put the weight class on the root Text while the glyphs sit in the
 * chip's inner span, across an inline View boundary, so both bold cases below
 * reported 400 before the fix. The last case is the control: an unweighted
 * Code reports 400, which is what the default state already paints, so only
 * the two 700 assertions can tell a reaching weight from a missing one.
 */
test("X-005 lets the code parts render a bold weight", async () => {
  const app = await openScenario("typography/code-weight");

  expect(app.spanStyle("text:Bold code").fontWeight).toBe(700);
  expect(app.spanStyle("text:Bold typed code").fontWeight).toBe(700);
  expect(app.spanStyle("text:Normal code").fontWeight).toBe(400);
});
