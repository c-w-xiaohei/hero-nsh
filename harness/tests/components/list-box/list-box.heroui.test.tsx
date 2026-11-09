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
 *
 * T-003 and the agents that press keys live in list-box.heroui.web.test.tsx:
 * they start with Tab on the listbox, which NSH 0.4.0's Win32 host cannot do
 * (approved difference, port sheet section 8). The pointer cases stay here and
 * run on every target.
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

// heroui/packages/react/src/components/list-box/list-box.tsx:20-29
// react-aria-components/src/ListBox.tsx:154-160
// X-001: the collection is rebuilt when items changes. The signal behind
// `items` is reordered, shrinks, grows at the front, and a static child is
// added after mount; every row a press selects must carry the id of the data
// at that position, not a stale key. Filling an initially empty list must
// replace the empty state with the new rows.
test("X-001 updates a live items collection and replaces the empty state", async () => {
  const app = await openFixture("dynamic-items");

  expect(app.count("role:option")).toBe(3);

  await app.press("id:reorder");
  await app.press("role:option >> nth=0");

  let changes = callsOf(app, "selectionChange");

  expect(changes[changes.length - 1][0]).toEqual(["3"]);

  await app.press("id:remove");

  expect(app.count("role:option")).toBe(2);
  expect(app.count("text:Two")).toBe(0);

  await app.press("id:prepend");

  expect(app.count("role:option")).toBe(3);
  expect(app.shows("text:Zed")).toBe(true);

  await app.press("role:option[Zed]");

  changes = callsOf(app, "selectionChange");
  expect(changes[changes.length - 1][0]).toEqual(["z"]);

  const children = await openFixture("dynamic-children");

  expect(children.count("role:option")).toBe(2);

  await children.press("id:add");

  expect(children.count("role:option")).toBe(3);
  expect(children.shows("text:Three")).toBe(true);

  await children.press("role:option[Three]");

  changes = callsOf(children, "selectionChange");
  expect(changes).toHaveLength(1);
  expect(changes[0][0]).toEqual(["3"]);

  const empty = await openFixture("empty-fill");

  expect(empty.shows("text:Empty list")).toBe(true);
  expect(empty.count("role:option")).toBe(0);

  await empty.press("id:fill");

  expect(empty.count("role:option")).toBe(2);
  expect(empty.count("text:Empty list")).toBe(0);

  await empty.press("role:option[One]");

  changes = callsOf(empty, "selectionChange");
  expect(changes).toHaveLength(1);
  expect(changes[0][0]).toEqual(["1"]);
});

// heroui/packages/styles/components/list-box-item.css:24-26
// X-005: the label shares the row's hit area. With shouldSelectOnPressUp a
// press on the label text itself must still run the row's selection on release.
test("X-005 pressing the label selects the row with shouldSelectOnPressUp", async () => {
  const app = await openFixture("press-up-label");

  expect(app.count("text:✓")).toBe(0);

  await app.press("text:One");

  const changes = callsOf(app, "selectionChange");

  expect(changes).toHaveLength(1);
  expect(changes[0][0]).toEqual(["1"]);
  expect(app.count("role:option[One] >> text:✓")).toBe(1);
});

// react-aria-components/src/ListBox.tsx:154-160,582-595
// X-006: replacing the data at an existing key re-renders that row, it does
// not leave the old content. The keyed list renames id "1" ("One" -> "Uno")
// under the same id; the keyless list replaces the object at position 0
// ("A" -> "C"), whose identity is the index. Both rows keep their key and
// must show the new text; the press payloads prove the keys did not move.
test("X-006 rebuilds a kept row from a replaced item", async () => {
  const app = await openFixture("dynamic-replace");

  expect(app.count("role:option")).toBe(4);
  expect(app.shows("text:One")).toBe(true);

  await app.press("id:rename");

  expect(app.count("text:One")).toBe(0);
  expect(app.count("text:Uno")).toBe(1);
  expect(app.count("role:option")).toBe(4);

  await app.press("role:option[Uno]");

  let changes = callsOf(app, "selectionChange");
  expect(changes[changes.length - 1][0]).toEqual(["1"]);

  expect(app.shows("text:A")).toBe(true);

  await app.press("id:replace");

  expect(app.count("text:A")).toBe(0);
  expect(app.count("text:C")).toBe(1);
  expect(app.count("role:option")).toBe(4);

  await app.press("role:option[C]");

  changes = callsOf(app, "selectionChange");
  expect(changes[changes.length - 1][0]).toEqual(["0"]);
});
