import { expect, open, test } from "nsh/test";
import { callsOf } from "../../helpers/calls";

/*
 * Web-only Kobalte Checkbox case: it reaches the content with Tab and presses
 * Space, which the web target does and a real Windows window does not ("Real
 * hosts" in the loop brief). The Windows keyboard focus and activation gap is a
 * registered difference.
 */

function openCase(
  name: string,
  params: Record<string, string | number | boolean> = {},
  options: { platform?: "windows" | "web" } = {},
) {
  return open("../../../checkbox.fixtures.tsx", {
    platform: "windows",
    width: 1024,
    height: 768,
    ...options,
    host: { params: { case: name, ...params } },
  });
}

// kobalte/packages/core/src/checkbox/checkbox.test.tsx:264
// Rewritten port (port sheet T-032): HeroUI's focusable target is the clickable
// content row, not the Control, so Tab reaches the content.
test("T-032 can be checked by pressing the Space key on the control", async () => {
  const app = await openCase("log", {}, { platform: "web" });

  expect(app.shows("text:Unchecked")).toBe(true);

  await app.keyboard.press("tab");
  expect(callsOf(app, "onFocus")).toHaveLength(1);

  await app.keyboard.press("space");
  expect(app.shows("text:Checked")).toBe(true);
  expect(callsOf(app, "onChange")[0]?.[0]).toBe(true);
});
