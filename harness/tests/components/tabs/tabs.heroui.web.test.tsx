import { expect, open, test } from "nsh/test";
import type { ScenarioOptions } from "../../helpers/open-scenario";
import { panelText } from "../../testers/tabs";

/*
 * HeroUI 3.2.7 regression case for Tabs that needs keyboard focus, ported to
 * NSH's view model per port sheet 4b (T-006).
 *
 * Why this file is `.web.`: NSH 0.4.0's Win32 host gives keyboard focus only to
 * an Input — Tab walks text fields, `ref.focus()` on a view is a no-op and
 * Return / Space do not activate a focused view
 * (`crates/nsh-platform-windows/src/input.rs:997-1053`, `mount.rs:440`;
 * `crates/nsh-core/src/props.rs:365`). The case starts with Tab, so a real
 * Windows window cannot drive it. Approved difference "Windows keyboard focus
 * and activation (NSH 0.4.0 host gap)", port sheet section 8.
 *
 * Upstream's `createTester("Tabs", { interactionType: "keyboard" })` focuses
 * the selected tab and then selects Analytics with the arrow keys; here Tab
 * enters the list (the selected tab takes the focus) and Right selects the next
 * tab, since `keyboardActivation` defaults to `"automatic"`. Upstream asserts
 * the selected tab's text; the visible equivalent is which panel is mounted.
 */

function openFixture(name: string, options_: ScenarioOptions = {}) {
  const { params, ...rest } = options_;

  return open("../../../tabs.fixtures.tsx", {
    platform: "windows",
    width: 1024,
    height: 768,
    ...rest,
    host: { params: { case: name, ...params } },
  });
}

// heroui/packages/react/tests/components/tabs/tabs.test.tsx:106
// Rewritten port (port sheet T-006): the aria read becomes the mounted panel.
test("T-006 supports keyboard selection via createTester", async () => {
  const app = await openFixture("heroui", { platform: "web" });

  await app.keyboard.press("tab");

  expect(panelText(app, "Overview panel")).toBe(true);

  await app.keyboard.press("arrowright");

  expect(panelText(app, "Overview panel")).toBe(false);
  expect(panelText(app, "Analytics panel")).toBe(true);
});
