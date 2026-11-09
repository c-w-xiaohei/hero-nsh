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
 * Web-only Switch cases: each one moves the keyboard focus with Tab, which the
 * web target does and a real Windows window does not ("Real hosts" in the loop
 * brief). They keep their titles and upstream comments unchanged.
 */

// heroui/packages/react/tests/components/switch/switch.test.tsx:85
test("T-006 supports Space key toggle", async () => {
  const app = await openCase("log", {}, { platform: "web" });
  const control = "role:switch[Enable notifications]";

  expect(app.shows("text:Off")).toBe(true);

  await app.keyboard.press("tab");
  expect(callsOf(app, "onFocus")).toHaveLength(1);

  await app.keyboard.press("space");
  expect(app.shows("text:On")).toBe(true);
  expect(callsOf(app, "onChange")).toEqual([[true]]);
});

// heroui/packages/react/tests/components/switch/switch.test.tsx:176
test("T-012 supports focus-visible via keyboard", async () => {
  const app = await openCase("log", {}, { platform: "web" });

  expect(app.shows("text:NoRing")).toBe(true);

  await app.keyboard.press("tab");
  expect(callsOf(app, "onFocus")).toHaveLength(1);
  expect(app.shows("text:FocusRing")).toBe(true);
});

// react-aria/src/toggle/useToggle.ts:174-176
test("X-001 keeps the focus ring off after a pointer press and toggles again with Space", async () => {
  const app = await openCase("log", {}, { platform: "web" });
  const control = "role:switch[Enable notifications]";

  await app.keyboard.press("tab");
  expect(app.shows("text:FocusRing")).toBe(true);

  await app.press(control);
  expect(app.shows("text:On")).toBe(true);
  expect(callsOf(app, "onChange")).toEqual([[true]]);
  expect(app.shows("text:NoRing")).toBe(true);

  await app.keyboard.press("space");
  expect(app.shows("text:Off")).toBe(true);
  expect(callsOf(app, "onChange")).toEqual([[true], [false]]);
});
