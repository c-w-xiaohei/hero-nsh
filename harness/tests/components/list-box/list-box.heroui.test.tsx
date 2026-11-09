import { expect, open, test } from "nsh/test";
import { callsOf } from "../../helpers/calls";
import { openScenario } from "../../helpers/open-scenario";
import type { ScenarioOptions } from "../../helpers/open-scenario";
import { options, selectOption, selectedOptions } from "../../testers/list-box";

/*
 * HeroUI 3.2.7 regression cases for ListBox, ListBoxItem and ListBoxSection,
 * per port sheet 4b (T-001 … T-003).
 *
 * `data-slot` and the BEM class strings are D18 deletions; T-001 keeps the
 * observable parts (role, accessible name, option count, visible texts).
 */

function openFixture(name: string, options_: ScenarioOptions = {}) {
  const { params, ...rest } = options_;

  return open("../../../list-box.fixtures.tsx", {
    platform: "windows",
    width: 1024,
    height: 768,
    ...rest,
    host: { params: { case: name, ...params } },
  });
}

// heroui/packages/react/tests/components/list-box/list-box.test.tsx:40
// Partial port (port sheet T-001): `data-slot="list-box"` and the BEM class
// assertion are D18 deletions. The role, the accessible name, the number of
// options and the three visible rows are kept; the accessible name comes only
// from the root's aria-label here, so a missing mapping fails this case.
test("T-001 exposes the listbox role and accessible name", async () => {
  const app = await openScenario("list-box/default");

  expect(app.shows("role:listbox[Users]")).toBe(true);
  expect(app.count("role:option")).toBe(3);
  expect(app.shows("text:Bob")).toBe(true);
  expect(app.shows("text:Fred")).toBe(true);
  expect(app.shows("text:Martha")).toBe(true);
});

// heroui/packages/react/tests/components/list-box/list-box.test.tsx:50
// Ported (port sheet T-002): the RAC ListBox tester becomes the local tester
// in harness/tests/testers/list-box.ts. The selected marker starts at 0 and is
// 1 after pressing Fred, a value the default state does not already have.
test("T-002 calls onSelectionChange when an option is selected via the ListBox tester", async () => {
  const app = await openFixture("log-users");

  expect(options(app)).toBe(3);
  expect(selectedOptions(app)).toBe(0);

  await selectOption(app, "Fred");

  const changes = callsOf(app, "selectionChange");

  expect(changes).toHaveLength(1);
  expect(changes[0][0]).toEqual(["fred"]);
  expect(selectedOptions(app)).toBe(1);
});

// heroui/packages/react/tests/components/list-box/list-box.test.tsx:70
// Ported (port sheet T-003): selectionMode="none" sends the press down the
// action branch; the item's own onAction wins, else the root's key. The group
// is named by aria-label because Header belongs to another unit.
test("T-003 supports sections with onAction when selectionMode is none", async () => {
  const app = await openFixture("section-action");

  expect(app.shows("role:option[Copy link]")).toBe(true);

  await app.press("role:option[Copy link]");

  expect(callsOf(app, "onAction")).toEqual([["copy-link"]]);
});
