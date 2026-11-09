import { expect, open, test } from "nsh/test";
import { callsOf } from "../../helpers/calls";
import type { ScenarioOptions } from "../../helpers/open-scenario";
import { close, menu, open as openMenu } from "../../testers/menu";

/*
 * HeroUI 3.2.7 regression cases for Menu that need the menu root to hold
 * keyboard focus, per port sheet 4b (T-003, plus the typeahead state case and
 * regression X-002).
 *
 * Why this file is `.web.`: NSH 0.4.0's Win32 host gives keyboard focus only to
 * an Input — Tab walks text fields, a click focuses only an Input, `ref.focus()`
 * on a view is a no-op and Return / Space do not activate a focused view
 * (`crates/nsh-platform-windows/src/input.rs:997-1053`, `mount.rs:440`;
 * `crates/nsh-core/src/props.rs:365`). The fixture mounts the Menu with
 * `autoFocus`, so the root's focus and its Escape binding only exist on macOS
 * and the web. Approved difference "Windows keyboard focus and activation
 * (NSH 0.4.0 host gap)", port sheet section 8.
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

// heroui/packages/react/tests/components/menu/menu.test.tsx:93
// Ported (port sheet T-003): the menu opens, Escape unmounts it through the
// root's keymap binding, and no action ran. The unit registers the Escape
// channel itself because it has no MenuTrigger / Popover (port sheet §5).
test("T-003 supports Escape dismiss without selecting", async () => {
  const app = await openFixture("escape", { platform: "web" });

  await openMenu(app);

  expect(menu(app)).toBe(true);

  await close(app);
  await app.waitFor("role:menu", { state: "gone" });

  expect(menu(app)).toBe(false);
  expect(callsOf(app, "onAction")).toHaveLength(0);
});

/** Any text that ends with the fixture's typeahead focus marker. */
const FOCUS_MARKER = "text:/\\*$/";

// Fixture case typeahead: characters move the focused row, and the manual clock
// proves the search string resets after 500 ms. No T- row covers typeahead.
test("typeahead focuses rows by prefix and resets after 500 ms", async () => {
  const app = await openFixture("typeahead", { platform: "web", clock: {} });

  await app.waitFor("role:menu");

  await app.keyboard.press("arrowdown");
  await app.waitFor("text:One*");

  await app.keyboard.press("t");
  await app.waitFor("text:Two*");

  expect(app.count(FOCUS_MARKER)).toBe(1);

  await app.clock!.runFor(500);

  await app.keyboard.press("o");

  expect(app.shows("text:One*")).toBe(true);
  expect(app.count(FOCUS_MARKER)).toBe(1);
});

// Regression X-002, evidence: src/components/menu/menu-item.tsx:409-429, 436-461
// React Aria closes per activating key: keyboard Enter closes (as do
// selectionMode "none" and a link), while keyboard Space in single selection
// leaves the menu open; the pointer rule is the different
// `selectionMode !== "multiple"` formula
// (react-aria@3.48.0/dist/private/menu/useMenuItem.js:114).
// shouldCloseAfterActivation only checked `selectionMode !== "multiple"`, so
// Space in single selection closed and Enter in multiple selection never did.
// onAction proves the key activated a row, so an open menu is not a dead key.
test("X-002 closes per activating key, not only per selection mode", async () => {
  const single = await openFixture("keyboard-close", {
    platform: "web",
    params: { mode: "single" },
  });

  await single.keyboard.press("arrowdown");
  await single.keyboard.press("space");

  expect(callsOf(single, "onAction")).toHaveLength(1);
  expect(callsOf(single, "onClose")).toHaveLength(0);

  const multiple = await openFixture("keyboard-close", {
    platform: "web",
    params: { mode: "multiple" },
  });

  await multiple.keyboard.press("arrowdown");
  await multiple.keyboard.press("enter");

  expect(callsOf(multiple, "onAction")).toHaveLength(1);
  expect(callsOf(multiple, "onClose")).toHaveLength(1);
});
