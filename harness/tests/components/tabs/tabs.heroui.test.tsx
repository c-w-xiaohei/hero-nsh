import { expect, open, test } from "nsh/test";
import type { ScenarioOptions } from "../../helpers/open-scenario";
import { panelText, selectionCalls, tab } from "../../testers/tabs";

/*
 * HeroUI 3.2.7 regression cases for Tabs that a pointer can drive, ported to
 * NSH's view model per port sheet 4b (T-005, T-007).
 *
 * The upstream fixture is `renderTabs` in tabs.test.tsx: three tabs overview /
 * analytics / reports with the third one disabled, and one panel per tab. Its
 * React Aria tester reads `aria-selected` and the active tabpanel; `nsh/test`
 * has neither, so the selected tab is the one whose panel is on screen — an
 * unselected panel is unmounted (port sheet R-048, section 8).
 *
 * The cases that need Tab to move the keyboard focus are in
 * tabs.heroui.web.test.tsx (T-006) because of the approved Windows host gap.
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

// heroui/packages/react/tests/components/tabs/tabs.test.tsx:86
// Rewritten port (port sheet T-005): the tester's `getTabs`, `getSelectedTab`
// and `getActiveTabpanel` become text and panel checks, and the one callback
// assertion becomes the recorded payload.
test("T-005 supports selecting tabs via createTester", async () => {
  const app = await openFixture("heroui");

  expect(app.count("role:tab")).toBe(3);
  expect(app.shows("role:tab[Overview]")).toBe(true);
  expect(app.shows("role:tab[Analytics]")).toBe(true);
  expect(app.shows("role:tab[Reports]")).toBe(true);

  expect(panelText(app, "Overview panel")).toBe(true);
  expect(panelText(app, "Analytics panel")).toBe(false);
  expect(panelText(app, "Reports panel")).toBe(false);
  expect(selectionCalls(app)).toHaveLength(0);

  await tab(app, "Analytics");

  expect(selectionCalls(app)).toHaveLength(1);
  expect(selectionCalls(app)[0][0]).toBe("analytics");
  expect(panelText(app, "Overview panel")).toBe(false);
  expect(panelText(app, "Analytics panel")).toBe(true);
});

// heroui/packages/react/tests/components/tabs/tabs.test.tsx:119
// Rewritten port (port sheet T-007): the disabled tab cannot be selected and
// reports nothing. Two host-level assertions are added, as the sheet asks: the
// tab is disabled and the press is refused by the host, which is the NSH
// equivalent of the browser swallowing a click on a disabled element.
test("T-007 supports disabled tabs without selecting", async () => {
  const app = await openFixture("heroui");

  expect(panelText(app, "Overview panel")).toBe(true);
  expect(app.enabled("role:tab[Reports]")).toBe(false);

  await expect(app.press("role:tab[Reports]")).rejects.toMatchObject({
    code: "ERR_NSH_TEST_DISABLED",
  });

  expect(panelText(app, "Overview panel")).toBe(true);
  expect(panelText(app, "Reports panel")).toBe(false);
  expect(selectionCalls(app)).toHaveLength(0);
});
