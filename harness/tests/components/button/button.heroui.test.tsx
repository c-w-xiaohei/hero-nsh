import { expect, test } from "nsh/test";
import { callsOf } from "../../helpers/calls";
import { openScenario } from "../../helpers/open-scenario";

/*
 * HeroUI 3.2.7 regression cases for Button, per port sheet 4b (T-001 … T-013).
 * Every case keeps its upstream file:line and title.
 *
 * Class strings and data-* attributes are not projected by NSH (D18), so the
 * cases that asserted them assert the effect a user can observe instead:
 * resolved span colors, callbacks recorded through probe(), enabled().
 */

// Resolved on the harness theme (hero-nsh.theme.json):
// accent-soft-foreground #1e63aeff, red-500 #fb2c36ff.
const ACCENT_SOFT_FOREGROUND = "#1e63aeff";
const RED_500 = "#fb2c36ff";

// heroui/packages/react/tests/components/button/button.test.tsx:27
test("T-001 renders with role and accessible name", async () => {
  const app = await openScenario("button/basic");

  expect(app.shows("role:button[Save]")).toBe(true);
});

// heroui/packages/react/tests/components/button/button.test.tsx:41
test("T-003 exposes the variant through the resolved text color", async () => {
  const app = await openScenario("button/variants");

  expect(app.spanStyle("text:Secondary").color).toBe(ACCENT_SOFT_FOREGROUND);
});

// heroui/packages/react/tests/components/button/button.test.tsx:49
test("T-004 lets a string className win over the variant classes", async () => {
  const app = await openScenario("button/custom-class");

  expect(app.spanStyle("text:Custom").color).toBe(RED_500);
});

// heroui/packages/react/tests/components/button/button.test.tsx:62
test("T-005 supports testID passthrough", async () => {
  const app = await openScenario("button/basic");

  expect(app.shows("id:save-btn")).toBe(true);
});

// heroui/packages/react/tests/components/button/button.test.tsx:68
test("T-006 supports hover state", async () => {
  const app = await openScenario("button/hover");

  expect(callsOf(app, "onHoverStart")).toHaveLength(0);

  await app.hover("role:button[Save]");
  expect(callsOf(app, "onHoverStart")).toHaveLength(1);

  await app.hover("role:button[Other]");
  expect(callsOf(app, "onHoverEnd")).toHaveLength(1);
});

// heroui/packages/react/tests/components/button/button.test.tsx:81
test("T-007 supports press state", async () => {
  const app = await openScenario("button/press");

  expect(callsOf(app, "onPressDown")).toHaveLength(0);

  await app.dragAndHold("role:button[Save]", { x: 0, y: 0 });
  expect(callsOf(app, "onPressDown")).toHaveLength(1);
  expect(callsOf(app, "onPressChange")).toEqual([[true]]);

  await app.drop();
  expect(callsOf(app, "onPressUp")).toHaveLength(1);
  expect(callsOf(app, "onPressChange")).toEqual([[true], [false]]);
});

// heroui/packages/react/tests/components/button/button.test.tsx:94
test("T-008 calls onPress on click", async () => {
  const app = await openScenario("button/press");

  await app.press("role:button[Save]");

  expect(callsOf(app, "onPress")).toHaveLength(1);
});

// heroui/packages/react/tests/components/button/button.test.tsx:103
test("T-009 supports focus-visible via keyboard", async () => {
  const app = await openScenario("button/focus", { platform: "web" });

  expect(app.shows("text:Save")).toBe(true);

  await app.keyboard.press("tab");
  expect(callsOf(app, "onFocus")).toHaveLength(1);
  expect(app.shows("text:Focus visible")).toBe(true);

  await app.keyboard.press("tab");
  expect(callsOf(app, "onBlur")).toHaveLength(1);
  expect(app.shows("text:Save")).toBe(true);
});

// heroui/packages/react/tests/components/button/button.test.tsx:117
test("T-010 supports disabled state and blocks press", async () => {
  const app = await openScenario("button/disabled");

  expect(app.enabled("role:button[Save]")).toBe(false);
  await expect(app.press("role:button[Save]")).rejects.toMatchObject({
    code: "ERR_NSH_TEST_DISABLED",
  });
  expect(callsOf(app, "onPress")).toHaveLength(0);
});

// heroui/packages/react/tests/components/button/button.test.tsx:134
test("T-011 exposes no hover state when disabled", async () => {
  const app = await openScenario("button/disabled");

  await app.hover("role:button[Save]");
  expect(callsOf(app, "onHoverStart")).toHaveLength(0);
});

// heroui/packages/react/tests/components/button/button.test.tsx:142
test("T-012 supports keyboard activation with Enter and Space", async () => {
  const app = await openScenario("button/press", { platform: "web" });

  await app.keyboard.press("tab");
  expect(callsOf(app, "onFocus")).toHaveLength(1);

  await app.keyboard.press("enter");
  expect(callsOf(app, "onPress")).toHaveLength(1);

  await app.keyboard.press("space");
  expect(callsOf(app, "onPress")).toHaveLength(2);
});

// heroui/packages/react/tests/components/button/button.test.tsx:158
test("T-013 supports render-prop children for press state", async () => {
  const app = await openScenario("button/render-props");

  expect(app.shows("text:Save")).toBe(true);

  await app.dragAndHold("role:button[Save]", { x: 0, y: 0 });
  expect(app.shows("text:Pressed")).toBe(true);

  await app.drop();
  expect(app.shows("text:Save")).toBe(true);
});

// heroui/packages/styles/components/button.css:30-32
test("X-001 keeps focus-visible through a keyboard activation", async () => {
  const app = await openScenario("button/focus", { platform: "web" });

  await app.keyboard.press("tab");
  expect(app.shows("text:Focus visible")).toBe(true);

  await app.keyboard.press("enter");
  expect(app.shows("text:Focus visible")).toBe(true);
});

test("X-002 keeps dynamic children live across a press", async () => {
  const app = await openScenario("button/counter");
  const shown = () => app.texts().join(" ").replace(/\s+/g, " ").trim();

  expect(shown()).toContain("Save 0");

  await app.press("id:counter-button");
  expect(shown()).toContain("Save 1");
});

// react-spectrum/packages/react-aria/src/interactions/useFocusVisible.ts:86-100
test("X-003 a pointer press on the focused button clears focus-visible", async () => {
  const app = await openScenario("button/focus", { platform: "web" });

  await app.keyboard.press("tab");
  expect(app.shows("text:Focus visible")).toBe(true);

  await app.press("id:focus-button");
  expect(app.shows("text:Focus visible")).toBe(false);
});

// react-spectrum/packages/react-aria/src/interactions/useFocusVisible.ts:86-100
test("X-004 keeps focus-visible when Enter follows pointer hover and Tab", async () => {
  const app = await openScenario("button/focus", { platform: "web" });

  await app.hover("id:focus-button");
  await app.keyboard.press("tab");
  expect(app.shows("text:Focus visible")).toBe(true);

  await app.keyboard.press("enter");
  expect(app.shows("text:Focus visible")).toBe(true);
});
