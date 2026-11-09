import { expect, open, test } from "nsh/test";
import { callsOf } from "../../helpers/calls";

function openCase(
  name: string,
  params: Record<string, string | number | boolean> = {},
  options: { platform?: "windows" | "web" } = {},
) {
  return open("../../../switch.fixtures.tsx", {
    platform: "windows",
    width: 1024,
    height: 768,
    ...options,
    host: { params: { case: name, ...params } },
  });
}

/*
 * Web-only Kobalte Switch case: it reaches the control with Tab, and keyboard
 * focus does not move with Tab on a real Windows window ("Real hosts" in the
 * loop brief). The web target runs it unchanged.
 */

// kobalte/packages/core/src/switch/switch.test.tsx:244
test("T-028 can be checked by pressing the Space key on the control", async () => {
  const app = await openCase("log", {}, { platform: "web" });

  expect(app.shows("text:Off")).toBe(true);

  await app.keyboard.press("tab");
  expect(callsOf(app, "onFocus")).toHaveLength(1);

  await app.keyboard.press("space");
  expect(app.shows("text:On")).toBe(true);
  expect(callsOf(app, "onChange")).toEqual([[true]]);
});
