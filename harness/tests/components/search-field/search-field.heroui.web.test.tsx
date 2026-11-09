import { expect, test } from "nsh/test";
import { callsOf } from "../../helpers/calls";
import { openScenario } from "../../helpers/open-scenario";
import { lastInput } from "../../testers/search-field";

/*
 * Web-only SearchField case: T-009 moves the keyboard focus with Tab, which the
 * web target does (headless too) but NSH 0.4.0's Win32 host does not, since it
 * gives non-Input views no keyboard focus at all ("Windows keyboard focus" in
 * the loop brief). Keeping it in a `.web.` file is what lets the Windows run
 * skip it without weakening the assertion anywhere.
 */

// heroui/packages/react/tests/components/search-field/search-field.test.tsx:129
// Rewritten port (port sheet T-009): `data-focus-visible` is not projected
// (D18), so the case reads the Input's public focus callback and the render
// prop that drives the focus look. A text input is focus-visible as soon as it
// is focused, and the Group ring is driven by the same focus-within state
// (R-012).
test("T-009 supports focus-visible via keyboard", async () => {
  const app = await openScenario("search-field/focus.split", { platform: "web" });

  await app.keyboard.press("tab");
  expect(callsOf(app, "onFocus")).toHaveLength(1);

  expect(lastInput(app).isFocusVisible).toBe(true);
});
