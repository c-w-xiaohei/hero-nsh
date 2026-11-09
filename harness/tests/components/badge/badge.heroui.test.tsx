import { expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";
import { openScenario } from "../../helpers/open-scenario";

/*
 * HeroUI 3.2.7 regression cases for Badge, per port sheet 4b
 * (T-001, T-003, T-005).
 *
 * T-002, T-004 and T-006 are deleted there: they only assert `data-slot`, BEM
 * class names or a `data-*` attribute, and D18 drops that API surface. T-005
 * asserts the labeled sub-part that carries the label padding; its visible
 * consequence is measured through onLayout in harness/badge.fixtures.tsx.
 * The remaining cases read the rendered text and the resolved text color of
 * each color variant.
 *
 * Resolved on the harness theme (hero-nsh.theme.json):
 * accent-soft-foreground #1e63aeff.
 */
const ACCENT_SOFT_FOREGROUND = "#1e63aeff";

// heroui/packages/react/tests/components/badge/badge.test.tsx:6
test("T-001 renders text content", async () => {
  const app = await openScenario("badge/basic");

  expect(app.shows("text:5")).toBe(true);
});

// heroui/packages/react/tests/components/badge/badge.test.tsx:20
// Rewritten port (port sheet T-003): upstream asserts that the root carries the
// `badge--accent` BEM modifier. NSH does not project class names, so the case
// reads the modifier's visible effect: the five `variant="secondary"` badges
// resolve to five different text colors, with accent fixed to the theme's
// resolved accent-soft-foreground. A color mapping that is missing falls back
// to the default text color, which collapses the set below five and makes the
// success / warning / danger comparisons fail.
test("T-003 exposes color BEM modifier", async () => {
  const app = await openScenario("badge/colors");

  const defaultColor = app.spanStyle("text:1").color;
  const accentColor = app.spanStyle("text:2").color;
  const successColor = app.spanStyle("text:3").color;
  const warningColor = app.spanStyle("text:4").color;
  const dangerColor = app.spanStyle("text:5").color;

  expect(accentColor).toBe(ACCENT_SOFT_FOREGROUND);

  for (const color of [successColor, warningColor, dangerColor]) {
    expect(color).not.toBe(defaultColor);
  }

  expect(new Set([defaultColor, accentColor, successColor, warningColor, dangerColor]).size).toBe(5);
});

// heroui/packages/react/tests/components/badge/badge.test.tsx:40
// Rewritten port (port sheet T-005): upstream asserts that the implicit label
// sub-part (`data-slot="badge-label"`) exists, which is what applies
// `Badge.Label`'s px-0.5 padding to string children. NSH has no data-slot or
// computed-padding query, so the fixture measures the same geometry through
// onLayout around "Hello There", wide enough that `min-w-7` cannot mask the
// four points of horizontal padding. The implicit label must lay the root out
// exactly like an explicit Badge.Label, and both must be four points wider than
// the same label with `px-0`, which drops the padding. A root that does not
// auto-wrap string children, or a label that loses `px-0.5`, collapses one of
// those differences.
type LayoutCall = { name: string; width: number; height: number };

function lastLayout(app: App, name: string): LayoutCall {
  const calls = callsOf(app, "layout")
    .map((args) => args[0] as LayoutCall)
    .filter((call) => call.name === name);
  const found = calls[calls.length - 1];

  if (!found) throw new Error(`no layout call recorded for ${name}`);

  return found;
}

test("T-005 renders string children in a labeled sub-part", async () => {
  const app = await open("../../../badge.fixtures.tsx", {
    platform: "windows",
    width: 1024,
    height: 768,
  });

  const implicitRoot = lastLayout(app, "implicit-root");
  const explicitRoot = lastLayout(app, "explicit-root");
  const explicitLabel = lastLayout(app, "explicit-label");
  const noPaddingRoot = lastLayout(app, "no-padding-root");
  const noPaddingLabel = lastLayout(app, "no-padding-label");

  expect(implicitRoot.width).toBe(explicitRoot.width);
  expect(explicitLabel.width - noPaddingLabel.width).toBe(4);
  expect(implicitRoot.width - noPaddingRoot.width).toBe(4);
});

// src/components/badge/badge.styles.ts:46
// HeroUI's Badge.Label is a <span> (heroui/packages/react/src/components/badge/badge.tsx:126)
// whose only declaration is px-0.5 (heroui/packages/styles/components/badge.css:23-24),
// so its children lay out inline beside each other. NSH views with no display
// class are a column (docs/nsh/nsh_twref.md:54), which stacked an 8pt icon above
// the text: the label measured 24x23 against 24x15 for the same text alone. A
// row layout puts the icon beside the text, so the label widens by the icon and
// keeps the text's height.
test("X-001 lays an icon beside text inside Badge.Label", async () => {
  const app = await open("../../../badge.fixtures.tsx", {
    platform: "windows",
    width: 1024,
    height: 768,
  });

  const mixed = lastLayout(app, "mixed-label");
  const textOnly = lastLayout(app, "text-only-label");

  expect(mixed.width - textOnly.width).toBeGreaterThanOrEqual(7);
  expect(mixed.height).toBeLessThanOrEqual(textOnly.height + 2);
});
