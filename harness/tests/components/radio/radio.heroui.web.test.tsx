import { expect, open, test } from "nsh/test";
import { callsOf } from "../../helpers/calls";

function openCase(name: string, params: Record<string, string | number | boolean> = {}) {
  return open("../../../radio.fixtures.tsx", {
    platform: "web",
    width: 1024,
    height: 768,
    host: { params: { case: name, ...params } },
  });
}

/*
 * Web-only Radio cases: Tab moves the keyboard focus into the group, which the
 * web target does and a real Windows window does not ("Real hosts" in the loop
 * brief, and the registered Windows keyboard focus gap). They keep their
 * titles and upstream comments unchanged.
 */

// heroui/packages/react/tests/components/radio/radio.test.tsx:98
test("T-006 supports arrow key selection", async () => {
  const app = await openCase("log");

  await app.keyboard.press("tab");
  expect(callsOf(app, "onFocus")).toEqual([["a"]]);

  await app.keyboard.press("arrowdown");
  expect(app.shows("text:Premium:selected")).toBe(true);
  expect(callsOf(app, "onChange")).toEqual([["b"]]);

  await app.keyboard.press("arrowup");
  expect(app.shows("text:Basic:selected")).toBe(true);
  expect(callsOf(app, "onChange")).toEqual([["b"], ["a"]]);
});
