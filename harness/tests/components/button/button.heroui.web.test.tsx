import { expect, test } from "nsh/test";
import { callsOf } from "../../helpers/calls";
import { openScenario } from "../../helpers/open-scenario";

/*
 * Web-only Button cases: every one moves the keyboard focus with Tab, which the
 * web target does (and headless does too, but the Windows window does not;
 * "Real hosts" in the loop brief). Keeping them in a `.web.` file is what lets
 * the Windows run skip them without weakening the assertion anywhere.
 */

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

// heroui/packages/styles/components/button.css:30-32
test("X-001 keeps focus-visible through a keyboard activation", async () => {
  const app = await openScenario("button/focus", { platform: "web" });

  await app.keyboard.press("tab");
  expect(app.shows("text:Focus visible")).toBe(true);

  await app.keyboard.press("enter");
  expect(app.shows("text:Focus visible")).toBe(true);
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
