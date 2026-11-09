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
