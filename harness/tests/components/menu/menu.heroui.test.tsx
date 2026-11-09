import { expect, open, test } from "nsh/test";
import { callsOf } from "../../helpers/calls";
import type { ScenarioOptions } from "../../helpers/open-scenario";
import { menu, open as openMenu, options, selectOption } from "../../testers/menu";

/*
 * HeroUI 3.2.7 regression cases for Menu, MenuItem and MenuSection, per port
 * sheet 4b (T-001, T-002, T-004).
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
