import { expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";

/*
 * Web-only DisclosureGroup keyboard cases. Tab and Shift+Tab move the keyboard
 * focus on the web target; a real Windows window does not (NSH 0.4.0 host gap,
 * "Real hosts" in the loop brief). The group itself binds no key and is not
 * focusable (port sheet §1.2), so what this file checks is the plain Tab order
 * of the triggers.
 */

function openCase(): Promise<App> {
  return open("../../../disclosure.fixtures.tsx", {
    platform: "web",
    width: 1024,
    height: 768,
    host: { params: { case: "tab-order" } },
  });
}

function focusOrder(app: App): unknown[] {
  return callsOf(app, "focus").map((args) => args[0]);
}

// kobalte/packages/core/src/accordion/accordion.test.tsx:184
// Rewritten port (port sheet T-039): the Kobalte case focuses the first header
// programmatically and then walks Tab / Shift+Tab. NSH has no programmatic
// focus step, so the walk starts with the first Tab: the focused trigger's
// onFocus probe records which one it is, in the order one, two, one, two,
// three, After, three.
test("T-039 navigates the triggers through the tab key", async () => {
  const app = await openCase();

  await app.keyboard.press("tab");
  expect(focusOrder(app)).toEqual(["one"]);

  await app.keyboard.press("tab");
  expect(focusOrder(app)).toEqual(["one", "two"]);

  await app.keyboard.press("shift+tab");
  expect(focusOrder(app)).toEqual(["one", "two", "one"]);

  await app.keyboard.press("tab");
  expect(focusOrder(app)).toEqual(["one", "two", "one", "two"]);

  await app.keyboard.press("tab");
  expect(focusOrder(app)).toEqual(["one", "two", "one", "two", "three"]);

  await app.keyboard.press("tab");
  expect(focusOrder(app)).toEqual(["one", "two", "one", "two", "three", "after"]);

  await app.keyboard.press("shift+tab");
  expect(focusOrder(app)).toEqual(["one", "two", "one", "two", "three", "after", "three"]);
});
