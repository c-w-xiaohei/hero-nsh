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
// programmatically (:190-191) and then walks Tab / Shift+Tab. NSH's walk starts
// with the first Tab, and the trigger's onFocus probe records which one is
// focused, in the order one, two, one, two, three, After, three. Upstream's
// three negative checks (:206-208) are kept as not.toBe on the last probe.
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

  // kobalte/packages/core/src/accordion/accordion.test.tsx:206-208
  const focusedAfterThird = focusOrder(app).slice(-1)[0];
  expect(focusedAfterThird).not.toBe("one");
  expect(focusedAfterThird).not.toBe("two");
  expect(focusedAfterThird).not.toBe("three");

  await app.keyboard.press("shift+tab");
  expect(focusOrder(app)).toEqual(["one", "two", "one", "two", "three", "after", "three"]);
});
