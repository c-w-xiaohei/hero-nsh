import { expect, test } from "nsh/test";
import { callsOf } from "../../helpers/calls";
import { openScenario } from "../../helpers/open-scenario";

/*
 * Web-only CloseButton case: it moves the keyboard focus with Tab, which the
 * web target does and the Windows window does not ("Real hosts" in the loop
 * brief). Keeping it in a `.web.` file is what lets the Windows run skip it
 * without weakening the assertion anywhere.
 */

// heroui/packages/react/tests/components/close-button/close-button.test.tsx:129
// Rewritten port (port sheet T-010): `data-focus-visible` is not projected, so
// the case reads the public focus callbacks and the render prop that drives the
// ring. Tab focuses the button (onFocus, then onFocusChange(true), and the
// render prop switches to "Focus visible"); the next Tab blurs it (onBlur,
// onFocusChange(false), back to "Close"). The ring itself is paint, checked
// against R-006.
test("T-010 supports focus-visible via keyboard", async () => {
  const app = await openScenario("close-button/focus.split", { platform: "web" });

  expect(app.shows("text:Close")).toBe(true);

  await app.keyboard.press("tab");
  expect(callsOf(app, "onFocus")).toHaveLength(1);
  expect(callsOf(app, "onFocusChange")).toEqual([[true]]);
  expect(app.shows("text:Focus visible")).toBe(true);

  await app.keyboard.press("tab");
  expect(callsOf(app, "onBlur")).toHaveLength(1);
  expect(callsOf(app, "onFocusChange")).toEqual([[true], [false]]);
  expect(app.shows("text:Close")).toBe(true);
});
