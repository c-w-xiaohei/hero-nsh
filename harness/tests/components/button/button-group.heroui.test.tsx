import { expect, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";
import { openScenario } from "../../helpers/open-scenario";

/*
 * HeroUI 3.2.7 regression cases for ButtonGroup, per port sheet 4b
 * (T-014 … T-021). Classes and data-slot are not projected by NSH (D18);
 * where the upstream test read a modifier class, the case reads the effect
 * instead: layout bounds, resolved text colors, enabled() and probe calls.
 */

type Layout = { group: string; index: number; x: number; y: number; width: number; height: number };

function layouts(app: App): Layout[] {
  return callsOf(app, "layout").map(([value]) => value as Layout);
}

function lastLayout(app: App, group: string, index: number): Layout {
  const matches = layouts(app).filter((entry) => entry.group === group && entry.index === index);
  return matches[matches.length - 1];
}

// Resolved on the harness theme (hero-nsh.theme.json):
// accent-foreground #fcfcfcff, accent-soft-foreground #1e63aeff.
const ACCENT_FOREGROUND = "#fcfcfcff";
const ACCENT_SOFT_FOREGROUND = "#1e63aeff";

// heroui/packages/react/tests/components/button-group/button-group.test.tsx:13
test("T-014 renders with role=group and both children", async () => {
  const app = await openScenario("button-group/default");

  expect(app.shows("role:group")).toBe(true);
  expect(app.shows("role:button[One]")).toBe(true);
  expect(app.shows("role:button[Two]")).toBe(true);
});

// heroui/packages/react/tests/components/button-group/button-group.test.tsx:27
test("T-015 exposes the orientation through the main-axis layout", async () => {
  const app = await openScenario("button-group/orientation");
  await app.waitUntil(() => layouts(app).length >= 4);

  const horizontalFirst = lastLayout(app, "horizontal", 0);
  const horizontalSecond = lastLayout(app, "horizontal", 1);
  const verticalFirst = lastLayout(app, "vertical", 0);
  const verticalSecond = lastLayout(app, "vertical", 1);

  expect(horizontalSecond.x).toBeGreaterThan(horizontalFirst.x);
  expect(verticalSecond.y).toBeGreaterThan(verticalFirst.y);
});

// heroui/packages/react/tests/components/button-group/button-group.test.tsx:49
test("T-016 renders a Separator once inside the group", async () => {
  const app = await openScenario("button-group/separator");

  expect(app.shows("id:separator")).toBe(true);
  expect(app.count("id:separator")).toBe(1);
});

// heroui/packages/react/tests/components/button-group/button-group.test.tsx:64
test("T-017 inherits the group size and variant on a direct Button child", async () => {
  // Width 500 keeps the md: breakpoint (768 pt) off, so size="sm" is h-9 = 36 pt.
  const app = await openScenario("button-group/inherit", { width: 500 });
  await app.waitUntil(() => layouts(app).length >= 1);

  expect(lastLayout(app, "inherit", 0).height).toBe(36);
  expect(app.spanStyle("text:Save").color).toBe(ACCENT_SOFT_FOREGROUND);
});

// heroui/packages/react/tests/components/button-group/button-group.test.tsx:77
test("T-018 inherits isDisabled on a direct Button child", async () => {
  const app = await openScenario("button-group/disabled");

  expect(app.enabled("role:button[Save]")).toBe(false);
});

// heroui/packages/react/tests/components/button-group/button-group.test.tsx:87
test("T-019 child Button props override the group defaults", async () => {
  const app = await openScenario("button-group/override");
  const style = app.spanStyle("text:Override");

  expect(style.fontSize).toBe(16);
  expect(style.color).toBe(ACCENT_FOREGROUND);
  expect(style.fontSize).not.toBe(14);
});

// heroui/packages/react/tests/components/button-group/button-group.test.tsx:103
test("T-020 nested non-direct Buttons still mount and take presses", async () => {
  // Partial port: NSH cannot tell a direct child from a nested one, so inheritance
  // reaches nested Buttons too (registered difference). The structural and press
  // assertions are kept; the two "no inheritance" assertions are dropped.
  const app = await openScenario("button-group/nested");

  expect(app.shows("role:button[Nested]")).toBe(true);

  await app.press("role:button[Nested]");
  expect(callsOf(app, "onPress")).toHaveLength(1);
});

// heroui/packages/react/tests/components/button-group/button-group.test.tsx:118
test("T-021 supports pressing grouped buttons", async () => {
  const app = await openScenario("button-group/press");

  await app.press("role:button[Save]");

  expect(callsOf(app, "onPress")).toHaveLength(1);
});
