import { expect, test } from "nsh/test";
import { openScenario } from "../../helpers/open-scenario";

/*
 * HeroUI 3.2.7 regression cases for Badge, per port sheet 4b (T-001, T-003).
 *
 * T-002, T-004 and T-006 are deleted there: they only assert `data-slot`, BEM
 * class names or a `data-*` attribute, and D18 drops that API surface. T-005 is
 * converted to the `badge/label` screenshot, which the current acceptance does
 * not run. What is left is what a user can observe here: the rendered text and
 * the resolved text color of each color variant.
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
