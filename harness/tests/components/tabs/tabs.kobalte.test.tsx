import { expect, open, test } from "nsh/test";
import type { ScenarioOptions } from "../../helpers/open-scenario";
import { panelText, selectionCalls, tab } from "../../testers/tabs";

/*
 * Kobalte 0.13.14 regression cases for Tabs that a pointer can drive, ported to
 * HeroUI's API and to NSH's view model per port sheet 4b (T-010, T-016, T-020,
 * T-021, T-023).
 *
 * Kobalte's props do not exist in HeroUI: `value` / `defaultValue` become
 * `id` / `defaultSelectedKey`, `onChange` becomes `onSelectionChange`,
 * `activationMode` becomes `keyboardActivation`, and `disabled` on a trigger
 * becomes `isDisabled`. Its fixture values one / two / three become the HeroUI
 * pages overview / analytics / reports, with `Body 1` … becoming
 * `Overview panel` … (port sheet section 4b).
 *
 * `aria-selected`, `aria-controls`, `aria-labelledby` and the panel's
 * `role="tabpanel"` have no NSH counterpart (port sheet section 8), so the
 * selected tab is read as the panel that is mounted. The keyboard cases are in
 * tabs.kobalte.web.test.tsx because of the approved Windows host gap.
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

// kobalte/packages/core/src/tabs/tabs.test.tsx:36
// Partial port (port sheet T-010): kept are the three tabs and the default
// selection of the first one. Dropped are `aria-orientation`, each tab's
// `tabindex` and `aria-selected`, `aria-controls`, the panel lookup by id,
// `aria-labelledby` and the panel role — NSH has no read channel for any of
// them.
test("T-010 renders properly", async () => {
  const app = await openFixture("kobalte-plain");

  expect(app.count("role:tab")).toBe(3);
  expect(app.shows("role:tab[Overview]")).toBe(true);
  expect(app.shows("role:tab[Analytics]")).toBe(true);
  expect(app.shows("role:tab[Reports]")).toBe(true);

  expect(panelText(app, "Overview panel")).toBe(true);
  expect(panelText(app, "Analytics panel")).toBe(false);
  expect(panelText(app, "Reports panel")).toBe(false);
});

// kobalte/packages/core/src/tabs/tabs.test.tsx:323
// Partial port (port sheet T-016): kept are the pressed tab's selection, its
// panel replacing the first one, and the single `onSelectionChange` payload.
// Dropped are the four relation assertions (`aria-controls`, the panel id
// lookup, `aria-labelledby`, the panel role), which NSH cannot express.
test("T-016 supports using click to change tab", async () => {
  const app = await openFixture("kobalte-plain");

  expect(panelText(app, "Overview panel")).toBe(true);

  await tab(app, "Analytics");

  expect(panelText(app, "Analytics panel")).toBe(true);
  expect(panelText(app, "Overview panel")).toBe(false);
  expect(selectionCalls(app)).toHaveLength(1);
  expect(selectionCalls(app)[0][0]).toBe("analytics");
});

// kobalte/packages/core/src/tabs/tabs.test.tsx:457
// Rewritten port (port sheet T-020): a press on a disabled tab is refused by
// the host — the NSH equivalent of the browser not delivering a press — and
// the selection does not move or report.
test("T-020 disabled tabs cannot be pressed", async () => {
  const app = await openFixture("kobalte-disabled-middle");

  expect(app.enabled("role:tab[Analytics]")).toBe(false);

  await expect(app.press("role:tab[Analytics]")).rejects.toMatchObject({
    code: "ERR_NSH_TEST_DISABLED",
  });

  expect(selectionCalls(app)).toHaveLength(0);
  expect(panelText(app, "Overview panel")).toBe(true);
});

// kobalte/packages/core/src/tabs/tabs.test.tsx:490
// Partial port (port sheet T-021): with every tab disabled the first one is
// still selected, and the fallback goes through the state setter, so
// `onSelectionChange` reports it once. Dropped is the upstream "focus lands on
// the tabpanel" assertion: our panel is not a Tab stop (port sheet section 8).
test("T-021 selects first tab if all tabs are disabled", async () => {
  const app = await openFixture("kobalte-all-disabled");

  expect(app.enabled("role:tab[Overview]")).toBe(false);
  expect(panelText(app, "Overview panel")).toBe(true);
  expect(selectionCalls(app)).toHaveLength(1);
  expect(selectionCalls(app)[0][0]).toBe("overview");
});

// kobalte/packages/core/src/tabs/tabs.test.tsx:582
// Ported (port sheet T-023): pressing the already selected tab reports it again
// (`createSingleSelectListState` keeps Kobalte's `allowDuplicateSelectionEvents`)
// and the selection stays where it was.
test("T-023 fires onValueChange when clicking on the current tab", async () => {
  const app = await openFixture("kobalte-plain");

  expect(panelText(app, "Overview panel")).toBe(true);

  await tab(app, "Overview");

  expect(selectionCalls(app)).toHaveLength(1);
  expect(selectionCalls(app)[0][0]).toBe("overview");
  expect(panelText(app, "Overview panel")).toBe(true);
});
