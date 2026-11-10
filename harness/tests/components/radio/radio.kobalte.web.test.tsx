import { expect, open, test } from "nsh/test";
import { callsOf } from "../../helpers/calls";
import { getRadios } from "../../testers/radio";

function openCase(name: string, params: Record<string, string | number | boolean> = {}) {
  return open("../../../radio.fixtures.tsx", {
    platform: "web",
    width: 1024,
    height: 768,
    host: { params: { case: name, ...params } },
  });
}

/*
 * Web-only Kobalte case: it needs the keyboard focus that Tab moves onto a view,
 * which the web target does and a real Windows window does not ("Real hosts" in
 * the loop brief, and the registered Windows keyboard focus gap).
 */

// kobalte/packages/core/src/radio-group/radio-group.test.tsx:222
// Partial port (port sheet T-017): the Control's own keydown and the input
// assertions stay unread; HeroUI puts the focus and the role on the clickable
// row. NSH reaches a focused item by Tab, which lands on the group's single tab
// stop, so this case activates Dogs (the first option) where upstream pressed
// Space on Dragons; pressing Space on the focused radio is what it checks.
test("T-017 can select value by pressing the Space key on the item control", async () => {
  const app = await openCase("pets");

  expect(getRadios(app)).toBe(3);
  expect(app.shows("text:Dogs:unselected") && app.shows("text:Cats:unselected")).toBe(true);
  expect(callsOf(app, "onChange")).toHaveLength(0);

  await app.keyboard.press("tab");
  expect(callsOf(app, "onFocus")).toEqual([["dogs"]]);

  await app.keyboard.press("space");

  expect(callsOf(app, "onChange")).toEqual([["dogs"]]);
  expect(app.shows("text:Dogs:selected")).toBe(true);
  expect(app.shows("text:Cats:unselected") && app.shows("text:Dragons:unselected")).toBe(true);
});
