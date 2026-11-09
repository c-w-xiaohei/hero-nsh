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
// is named by aria-label because Header belongs to another unit. Both entry
// points are exercised: the pointer press and the keyboard activation of the
// focused row (Enter reaches the root as a native press on web).
test("T-003 supports sections with onAction when selectionMode is none", async () => {
  const app = await openFixture("section-action");

  expect(app.shows("role:option[Copy link]")).toBe(true);

  await app.press("role:option[Copy link]");

  expect(callsOf(app, "onAction")).toEqual([["copy-link"]]);

  const keyboard = await openFixture("section-action", { platform: "web" });

  await keyboard.keyboard.press("tab");
  await keyboard.keyboard.press("arrowdown");
  await keyboard.keyboard.press("enter");

  expect(callsOf(keyboard, "onAction")).toEqual([["copy-link"]]);
});

// Port sheet §1 (escapeKeyBehavior row): the root binds Escape while focused
// and clears the selection by default; "none" leaves it alone. The selection
// starts on Two, so an unchanged marker proves the Escape did nothing.
test("clears the selection on Escape and honors escapeKeyBehavior none", async () => {
  const app = await openFixture("escape", { platform: "web" });

  await app.keyboard.press("tab");
  expect(app.count("role:option[Two] >> text:✓")).toBe(1);

  await app.keyboard.press("escape");

  expect(app.count("role:option[Two] >> text:✓")).toBe(0);

  const changes = callsOf(app, "selectionChange");

  expect(changes).toHaveLength(1);
  expect(changes[0][0]).toEqual([]);

  const pinned = await openFixture("escape-none", { platform: "web" });

  await pinned.keyboard.press("tab");
  await pinned.keyboard.press("escape");

  expect(pinned.count("role:option[Two] >> text:✓")).toBe(1);
  expect(callsOf(pinned, "selectionChange")).toHaveLength(0);
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

// heroui/packages/react/src/components/list-box/list-box.stories.tsx:87,117
// X-002: three sections without ids, five 40 pt rows each, in a 160 pt box.
// The rows below the fold have no visible marker, so the focused row is read
// by activating it after PageDown: selectionMode is single and the payload
// names the key. Focus that stays in section A reports `a5`.
test("X-002 pages into the next keyless section", async () => {
  const app = await openFixture("keyless-sections", { platform: "web" });

  await app.keyboard.press("tab");
  expect(app.shows("text:A1*")).toBe(true);

  await app.keyboard.press("arrowdown");
  await app.keyboard.press("arrowdown");
  await app.keyboard.press("arrowdown");
  await app.keyboard.press("arrowdown");

  await app.keyboard.press("pagedown");
  await app.keyboard.press("space");

  const changes = callsOf(app, "selectionChange");
  const keys = changes[0][0] as string[];

  expect(changes).toHaveLength(1);
  expect(keys).toHaveLength(1);
  expect(keys[0]).toMatch(/^b[1-5]$/);
});

// heroui/packages/styles/components/list-box-item.css:37-39
// X-004: a pointer press must not show the keyboard focus ring. The fixture
// draws `Name*` for isFocused and `Name!` for isFocusVisible; the keyboard Tab
// first proves the ring marker is live, then the pointer press must clear it.
test("X-004 a pointer press does not show the keyboard focus ring", async () => {
  const app = await openFixture("focus-ring", { platform: "web" });

  await app.keyboard.press("tab");

  expect(app.shows("text:One*!")).toBe(true);

  await app.press("role:option[Two]");

  expect(app.count("text:/!$/")).toBe(0);
  expect(app.count("text:/\\*!$/")).toBe(0);
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
