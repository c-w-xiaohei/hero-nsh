import { open, test, expect } from "nsh/test";
import type { App } from "nsh/test";
import { calls, callsOf } from "../../helpers/calls";
import { openScenario } from "../../helpers/open-scenario";
import {
  close,
  menu,
  open as openMenu,
  options,
  selectOption,
} from "../../testers/dropdown";

/*
 * HeroUI 3.2.7 regression cases for Dropdown, per port sheet 4b: T-002,
 * T-004 … T-008, T-012 … T-014.
 *
 * T-003 and T-009 live in dropdown.heroui.web.test.tsx: both start with the
 * trigger holding keyboard focus, and NSH 0.4.0's Win32 host gives a non-Input
 * view no keyboard focus (approved difference, port sheet section 8).
 *
 * T-001 (data-slot), T-010 and T-011 (animation name / keyframes / computed
 * style) are the port sheet's deleted and screenshot rows; there is no
 * `nsh test` query for what they assert.
 *
 * Modal, AlertDialog and Drawer are not in this batch (port sheet section 5).
 * The handoff cases keep the dropdown half of the upstream assertions, with
 * the landed nsh/base `Dialog` standing in for the modal-level layer; the
 * `dialog` / `alertdialog` role assertions are dropped as the port sheet
 * records.
 *
 * Presence is checked on a manual clock because the 100 ms exit hold keeps the
 * popover mounted after closing: an immediate presence check would pass even
 * when the close went down the wrong path.
 */

function openFixture(name: string, extra: Parameters<typeof open>[1] = {}): Promise<App> {
  return open("../../../dropdown.fixtures.tsx", {
    platform: "windows",
    width: 1024,
    height: 768,
    clock: {},
    ...extra,
    host: { params: { case: name } },
  });
}

// heroui/packages/react/tests/components/dropdown/dropdown.test.tsx:33
// Partial port (port sheet T-002): five of the seven assertions. The dropped
// two are the `data-slot="dropdown-menu"` / `data-slot="dropdown-popover"`
// identity checks (D18).
test("T-002 supports open and select via Menu tester", async () => {
  const app = await openFixture("default");

  expect(menu(app)).toBe(false);

  await openMenu(app);

  expect(menu(app)).toBe(true);
  expect(options(app)).toBe(3);

  await selectOption(app, "Copy link");
  await app.clock!.runFor(200);

  expect(callsOf(app, "onAction")[0]?.[0]).toBe("copy-link");
  expect(menu(app)).toBe(false);
});

// heroui/packages/react/tests/components/dropdown/dropdown.test.tsx:83
// Ported (port sheet T-004): Escape goes through the popover overlay's
// `onCancel`, which needs no focused view, so this case runs on the Windows
// headless host too.
test("T-004 supports Escape dismiss without selecting", async () => {
  const app = await openFixture("default");

  await openMenu(app);
  expect(menu(app)).toBe(true);

  await close(app);
  await app.clock!.runFor(200);

  expect(menu(app)).toBe(false);
  expect(callsOf(app, "onAction")).toHaveLength(0);
});

// heroui/packages/react/tests/components/dropdown/dropdown.test.tsx:119
// Partial port (port sheet T-005): the menu gone and the row text gone. The
// `data-slot="dropdown-popover"` check is a D18 deletion and the `dialog` role
// assertion waits for Modal to land; a base Dialog stands in for the layer.
test("T-005 supports opening a Modal from an item without leaving the popover behind", async () => {
  const app = await openFixture("modal-handoff");

  await openMenu(app);
  await selectOption(app, "Open modal");
  await app.clock!.runFor(200);

  expect(menu(app)).toBe(false);
  expect(app.count("text:Open modal")).toBe(0);
});

// heroui/packages/react/tests/components/dropdown/dropdown.test.tsx:129
// Partial port (port sheet T-006): the controlled dropdown closes from
// `onAction` and does not leave its popover behind. `alertdialog` waits for
// AlertDialog; a base Dialog stands in for the layer.
test("T-006 supports closing a controlled dropdown while opening an AlertDialog", async () => {
  const app = await openFixture("dialog-handoff");

  await openMenu(app);
  await selectOption(app, "Delete project");
  await app.clock!.runFor(200);

  expect(menu(app)).toBe(false);
  expect(app.count("text:Delete project")).toBe(0);
});

// heroui/packages/react/tests/components/dropdown/dropdown.test.tsx:139
// Partial port (port sheet T-007): the menu gone and the row text gone; the
// `data-slot` and `dialog` assertions are dropped as in T-005.
test("T-007 supports opening a Drawer from an item without leaving the popover behind", async () => {
  const app = await openFixture("drawer-handoff");

  await openMenu(app);
  await selectOption(app, "Open drawer");
  await app.clock!.runFor(200);

  expect(menu(app)).toBe(false);
  expect(app.count("text:Open drawer")).toBe(0);
});

// heroui/packages/react/tests/components/dropdown/dropdown.test.tsx:149
// Partial port (port sheet T-008): the one behavior assertion kept is the
// core of the case — restoring focus to the trigger when the popover
// unmounts must not resurrect the controlled dropdown. Timers run twice, as
// upstream does.
test("T-008 keeps a controlled dropdown closed once the AlertDialog holds focus", async () => {
  const app = await openFixture("dialog-handoff");

  await openMenu(app);
  await selectOption(app, "Delete project");
  await app.clock!.runFor(200);
  await app.clock!.runFor(200);

  expect(menu(app)).toBe(false);
});

// heroui/packages/react/tests/components/dropdown/dropdown.browser.test.tsx:166
// Partial port (port sheet T-012): one behavior assertion. Five upstream
// assertions are DOM stacking and hit testing (dialog role, `data-exiting`,
// z-index equality, document order, `elementFromPoint`), which NSH's Overlay
// has no channel for. What stays: a press during the exit hold must not run a
// second action.
test("T-012 paints a Modal above the popover that is still closing behind it", async () => {
  const app = await openFixture("default");

  await openMenu(app);
  await selectOption(app, "Copy link");
  expect(callsOf(app, "onAction")).toHaveLength(1);

  // The popover is still on screen in its exit hold, with pointer events off.
  await app.press("role:menuitem[New file]");
  await app.clock!.runFor(200);

  expect(callsOf(app, "onAction")).toHaveLength(1);
});

// heroui/packages/react/tests/components/dropdown/dropdown.browser.test.tsx:194
// Partial port (port sheet T-013): the Clickable half. The two stacking and
// hit-testing assertions are dropped, and the modal-level host is the landed
// nsh/base Dialog standing in for Modal; when Modal lands this switches back.
test("T-013 keeps a popover opened inside a Modal clickable above that Modal", async () => {
  const app = await openFixture("inside-dialog");

  await app.press("role:button[Open modal]");
  await app.waitFor("text:Modal with dropdown");

  await app.press("role:button[Menu]");
  await app.waitFor("role:menu");

  await selectOption(app, "Rename");

  expect(callsOf(app, "onAction")).toHaveLength(1);
});

// heroui/packages/react/tests/components/dropdown/dropdown.browser.test.tsx:215
// Partial port (port sheet T-014): four size assertions (`offsetWidth` bounds,
// the icon's existence and its 16 pt width) have no query in `nsh test`. What
// stays: on a 390 pt viewport the wide row is still there, not collapsed. The
// min/max width formula itself is R-015 / R-016 and belongs to review.
test("T-014 renders the menu wide enough for row icons on a narrow viewport", async () => {
  const app = await openScenario("dropdown/narrow", {
    width: 390,
    height: 844,
    clock: {},
  });

  await app.press("role:button[Menu]");

  expect(app.shows("role:menuitem[System theme]")).toBe(true);
});

/*
 * Follow-up round, review regressions. The reviewer's probes ran the shared
 * `dropdown/submenus` scenario and the `inside-dialog` fixture; each case
 * below states the behavior the fix must reach, not the current one.
 */

// src/components/dropdown/dropdown-submenu-trigger.tsx:184-186, dropdown-item.tsx:84-86,
// src/components/menu/menu-item.tsx:521-523
// Probe: pressing WhatsApp in dropdown/submenus left both menus open and ran
// nothing, because every row of the submenu's Menu inherited the trigger
// context and was treated as a submenu trigger. A plain row must close the
// menus when pressed.
test("X-001 lets a row inside an open submenu act as a plain item", async () => {
  const app = await openScenario("dropdown/submenus", { clock: {} });

  await app.press("role:button[Menu]");
  await app.waitFor("role:menu");

  await app.hover("role:menuitem[Other]");
  await app.clock!.runFor(300);

  expect(app.count("role:menu")).toBe(2);

  await app.press("role:menuitem[WhatsApp]");
  await app.clock!.runFor(200);

  expect(app.count("role:menu")).toBe(0);
});

// src/components/menu/menu-item.tsx:521-523, src/components/dropdown/dropdown-item.tsx:86
// Probe: pressing Other in dropdown/submenus and advancing 50 ms (below the
// 200 ms hover delay) left one menu, so a press did not open the submenu on
// its trigger row.
test("X-002 opens a submenu on press, before the hover delay", async () => {
  const app = await openScenario("dropdown/submenus", { clock: {} });

  await app.press("role:button[Menu]");
  await app.waitFor("role:menu");

  await app.press("role:menuitem[Other]");
  await app.clock!.runFor(50);

  expect(app.count("role:menu")).toBe(2);
  expect(app.shows("role:menuitem[Copy Link]")).toBe(true);
});

// src/components/dropdown/dropdown-popover.tsx:541-542, select-popover.tsx:421-422,
// tmp/docs/nsh/nsh_el_overlay.md:124-128
// Probe: a closed Dropdown inside an open base Dialog swallowed Escape and the
// dialog stayed open, because the unmounted-looking popover still passed
// onCancel. Only an open layer may listen.
test("X-003 keeps a closed dropdown from taking Escape from the dialog above it", async () => {
  const app = await openFixture("inside-dialog");

  await app.press("role:button[Open modal]");
  await app.waitFor("text:Modal with dropdown");

  await app.keyboard.press("escape");
  await app.waitFor("text:Modal with dropdown", { state: "gone" });

  expect(app.shows("text:Modal with dropdown")).toBe(false);
});

// src/components/dropdown/dropdown-popover.tsx:541-542, select-popover.tsx:421-422,
// tmp/docs/nsh/nsh_el_overlay.md:124-128
// Probe: in dropdown/submenus Escape left both menus open. An open submenu must
// handle the key itself and close only itself; a second Escape then closes the
// root menu.
test("X-004 closes only the open submenu on Escape", async () => {
  const app = await openScenario("dropdown/submenus", { clock: {} });

  await app.press("role:button[Menu]");
  await app.waitFor("role:menu");

  await app.hover("role:menuitem[Other]");
  await app.clock!.runFor(300);

  expect(app.count("role:menu")).toBe(2);

  await app.keyboard.press("escape");
  await app.clock!.runFor(200);

  expect(app.count("role:menu")).toBe(1);
  expect(app.shows("role:menuitem[Copy Link]")).toBe(true);

  await app.keyboard.press("escape");
  await app.clock!.runFor(200);

  expect(app.count("role:menu")).toBe(0);
});
