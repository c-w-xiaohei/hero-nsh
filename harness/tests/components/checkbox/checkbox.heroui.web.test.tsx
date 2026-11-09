import { expect, open, test } from "nsh/test";
import { callsOf } from "../../helpers/calls";
import { toggleCheckboxByKeyboard } from "../../testers/checkbox";

/*
 * Web-only HeroUI Checkbox cases: each one moves the keyboard focus with Tab,
 * which the web target does and a real Windows window does not ("Real hosts" in
 * the loop brief). They keep their upstream titles and comments; the Windows
 * keyboard focus and activation gap is a registered difference.
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

// heroui/packages/react/tests/components/checkbox/checkbox.test.tsx:166
test("T-010 supports Space key toggle", async () => {
  const app = await openCase("log", {}, { platform: "web" });

  await app.keyboard.press("tab");
  expect(callsOf(app, "onFocus")).toHaveLength(1);

  await app.keyboard.press("space");
  expect(app.shows("text:Checked")).toBe(true);
  expect(callsOf(app, "onChange")).toEqual([[true]]);
});

// heroui/packages/react/tests/components/checkbox/checkbox.test.tsx:195
test("T-012 supports focus-visible via keyboard", async () => {
  const app = await openCase("log", {}, { platform: "web" });

  expect(app.shows("text:NoRing")).toBe(true);

  await app.keyboard.press("tab");
  expect(callsOf(app, "onFocus")).toHaveLength(1);
  expect(app.shows("text:FocusRing")).toBe(true);
});

// heroui/packages/react/tests/components/checkbox-group/checkbox-group.test.tsx:130
test("T-017 supports keyboard toggle via createTester", async () => {
  const app = await openCase("group-log", {}, { platform: "web" });

  await toggleCheckboxByKeyboard(app, ["Coding", "Design"], "Design");

  expect(callsOf(app, "groupChange")).toEqual([[["design"]]]);
});
