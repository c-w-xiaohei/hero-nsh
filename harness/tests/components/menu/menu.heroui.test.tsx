import { expect, open, test } from "nsh/test";
import { callsOf } from "../../helpers/calls";
import type { ScenarioOptions } from "../../helpers/open-scenario";
import { menu, open as openMenu, options, selectOption, selectedOptions } from "../../testers/menu";

/*
 * HeroUI 3.2.7 regression cases for Menu, MenuItem and MenuSection, per port
 * sheet 4b (T-001, T-002, T-004), plus the fixture's own state cases (selection,
 * controlled / default keys, Section-level selection, disabled, items, empty,
 * submenu flags, danger) and regression X-001.
 *
 * Menu has no Trigger and no Popover in this unit (port sheet §5): the fixture
 * plays both with a button and a conditionally mounted Menu, so these cases
 * cover the collection and its close contract, not the overlay. The overlay
 * cases (outside press, focus return, submenu opening) belong to Dropdown.
 *
 * `data-slot` and the BEM class strings are D18 deletions; nothing here hides
 * a case on a target where it could run.
 *
 * T-003 starts with Escape on the focused root and lives in
 * menu.heroui.web.test.tsx: NSH 0.4.0's Win32 host gives keyboard focus only to
 * an Input (approved difference, port sheet section 8).
 */

function openFixture(name: string, options_: ScenarioOptions = {}) {
  const { params, ...rest } = options_;

  return open("../../../menu.fixtures.tsx", {
    platform: "windows",
    width: 1024,
    height: 768,
    ...rest,
    host: { params: { case: name, ...params } },
  });
}

// heroui/packages/react/tests/components/menu/menu.test.tsx:53
// Partial port (port sheet T-001): the six upstream assertions are cut to the
// three visible contracts. `data-slot="menu"`, `className` containing "menu"
// and `data-slot="menu-item"` are D18 deletions named in the port sheet; the
// absent menu before open, the present menu after, and the three rows stay.
test("T-001 exposes the menu role and three menu items", async () => {
  const app = await openFixture("log");

  expect(menu(app)).toBe(false);

  await openMenu(app);

  expect(menu(app)).toBe(true);
  expect(options(app)).toBe(3);
});

// heroui/packages/react/tests/components/menu/menu.test.tsx:74
// Ported (port sheet T-002): selectionMode defaults to "none", so the press
// runs the action branch and RAC's default shouldClose closes the menu. The
// fixture unmounts it from onClose, which is what makes the second assertion
// observable.
test("T-002 calls onAction when an item is selected", async () => {
  const app = await openFixture("log");

  await openMenu(app);
  await selectOption(app, "Copy link");

  const actions = callsOf(app, "onAction");

  expect(actions[0][0]).toBe("copy-link");

  await app.waitFor("role:menu", { state: "gone" });

  expect(menu(app)).toBe(false);
});

// heroui/packages/react/tests/components/menu/menu.test.tsx:113
// Rewritten (port sheet T-004): the three upstream assertions keep their count
// and change their form. The Header text stays a text query; the BEM
// `.menu-section` becomes the group role the Section renders; the row press
// still reports "copy-link" through the Menu's onAction.
test("T-004 supports Menu.Section with Header and item action", async () => {
  const app = await openFixture("section");

  expect(app.shows("text:File")).toBe(true);
  expect(app.shows("role:group")).toBe(true);

  await selectOption(app, "Copy link");

  expect(callsOf(app, "onAction")[0][0]).toBe("copy-link");
});

/* -------------------------------------------------------------------------------------------------
 * Selection, collection and state paths (review finding: the fixture declared
 * these cases, but no test opened them)
 * -----------------------------------------------------------------------------------------------*/

// Fixture case single-log. selectionMode is the dimension no T- row touches:
// single selection marks exactly one row and reports the pressed key.
test("single selection marks exactly one row and reports its key", async () => {
  const app = await openFixture("single-log");

  expect(options(app, "menuitemradio")).toBe(3);

  await selectOption(app, "Two", "menuitemradio");

  expect(app.count("id:item-2 >> text:✓")).toBe(1);
  expect(app.count("id:item-1 >> text:✓")).toBe(0);
  expect(selectedOptions(app)).toBe(1);
  expect(callsOf(app, "selectionChange").map((args) => args[0])).toEqual([["2"]]);
});

// Fixture case multiple-log: a second press adds to the selection instead of
// replacing it, and both rows stay marked.
test("multiple selection accumulates keys and keeps every row marked", async () => {
  const app = await openFixture("multiple-log");

  expect(options(app, "menuitemcheckbox")).toBe(3);

  await selectOption(app, "Two", "menuitemcheckbox");
  await selectOption(app, "Three", "menuitemcheckbox");

  expect(selectedOptions(app)).toBe(2);
  expect(callsOf(app, "selectionChange").map((args) => args[0])).toEqual([
    ["2"],
    ["2", "3"],
  ]);
});

// Fixture case default-selected: the uncontrolled initial value selects key 2,
// not an arbitrary row, so the per-row markers pin which row carries it.
test("defaultSelectedKeys starts the menu with exactly that row selected", async () => {
  const app = await openFixture("default-selected");

  expect(app.count("id:item-2 >> text:✓")).toBe(1);
  expect(app.count("id:item-1 >> text:✓")).toBe(0);
  expect(app.count("id:item-3 >> text:✓")).toBe(0);
});

// Fixture case controlled: the parent owns selectedKeys, reports each attempted
// change, and the selection only moves when the parent replaces it.
test("a controlled selectedKeys ignores presses and follows the parent", async () => {
  const app = await openFixture("controlled");

  expect(app.count("id:item-1 >> text:✓")).toBe(1);

  await app.press("id:force");

  expect(app.count("id:item-3 >> text:✓")).toBe(1);
  expect(selectedOptions(app)).toBe(1);

  await selectOption(app, "Two", "menuitemradio");

  expect(callsOf(app, "selectionChange").map((args) => args[0])).toEqual([["2"]]);
  expect(app.count("id:item-3 >> text:✓")).toBe(1);
  expect(app.count("id:item-2 >> text:✓")).toBe(0);
});

// Fixture case group-selection: each Section owns its selection manager, so a
// press in Text Style replaces Bold with Italic and leaves Text Alignment's
// Left row alone.
test("a Section's own selection replaces keys inside that section only", async () => {
  const app = await openFixture("group-selection");

  expect(app.count("id:item-bold >> text:✓")).toBe(1);
  expect(app.count("id:item-left >> text:✓")).toBe(1);

  await selectOption(app, "Italic", "menuitemradio");

  expect(app.count("id:item-italic >> text:✓")).toBe(1);
  expect(app.count("id:item-bold >> text:✓")).toBe(0);
  expect(app.count("id:item-left >> text:✓")).toBe(1);
  expect(callsOf(app, "sectionSelection").map((args) => args[0])).toEqual([["italic"]]);
});

// Fixture case disabled: a key in disabledKeys and a row with isDisabled are
// both refused by the host, while the enabled row still runs the action.
test("disabled rows refuse presses and the enabled row still acts", async () => {
  const app = await openFixture("disabled");

  expect(options(app)).toBe(3);
  expect(app.enabled("role:menuitem[One]")).toBe(true);
  expect(app.enabled("role:menuitem[Two]")).toBe(false);
  expect(app.enabled("role:menuitem[Three]")).toBe(false);

  await app.press("role:menuitem[One]");

  expect(callsOf(app, "onAction")).toEqual([["1"]]);

  await expect(app.press("role:menuitem[Two]")).rejects.toMatchObject({
    code: "ERR_NSH_TEST_DISABLED",
  });

  expect(callsOf(app, "onAction")).toEqual([["1"]]);
});

// Fixture case empty: an empty collection still mounts the menu root and shows
// the caller's empty state instead of rows.
test("renderEmptyState replaces an empty collection", async () => {
  const app = await openFixture("empty");

  expect(menu(app)).toBe(true);
  expect(options(app)).toBe(0);
  expect(app.shows("text:No actions")).toBe(true);
});

// Fixture case items: the `items` prop builds the collection, and a row's key
// is its value object's id.
test("the items prop builds the collection from the given array", async () => {
  const app = await openFixture("items");

  expect(options(app)).toBe(2);
  expect(app.shows("text:Alpha")).toBe(true);

  await selectOption(app, "Beta");

  expect(callsOf(app, "onAction")).toEqual([["item-b"]]);
});

// Fixture case submenu: aria-haspopup / aria-expanded are the only submenu
// inputs this unit has, and they reach the item's render props.
test("aria-haspopup and aria-expanded reach the item render props", async () => {
  const app = await openFixture("submenu");

  expect(options(app)).toBe(4);
  expect(app.shows("text:submenu=true open=true")).toBe(true);
  expect(app.shows("text:submenu=false open=false")).toBe(false);
});

// Fixture case danger-indicator: the danger variant paints the row label with
// the theme's danger color (R-004), which a text span can report.
test("the danger variant paints the row label with the danger color", async () => {
  const app = await openFixture("danger-indicator");

  expect(app.spanStyle("text:Delete").color).toBe("#ff383cff");
  expect(app.spanStyle("text:Move").color).toBe("#ff383cff");
});

/* -------------------------------------------------------------------------------------------------
 * Review regressions
 * -----------------------------------------------------------------------------------------------*/

// Regression X-001, evidence: src/components/menu/menu-item.tsx:201-229, 305-313
// resolveKey() fell back to `textValue ?? ""`, so two static items without an id
// shared the key "". ListCollection keys by that string, keeps one node, and
// both rows then read the same selection. React Aria gives every node a unique
// auto key instead (react-aria@3.48.0/dist/private/collections/Document.js:212).
// Each marker carries its own testID, so a shared key shows as two ✓ at once.
test("X-001 gives each id-less static item its own key", async () => {
  const app = await openFixture("idless");

  expect(options(app, "menuitemradio")).toBe(2);

  await selectOption(app, "Alpha", "menuitemradio");

  expect(app.count("id:item-alpha >> text:✓")).toBe(1);
  expect(app.count("id:item-beta >> text:✓")).toBe(0);

  await selectOption(app, "Beta", "menuitemradio");

  expect(app.count("id:item-beta >> text:✓")).toBe(1);
  expect(app.count("id:item-alpha >> text:✓")).toBe(0);
});
