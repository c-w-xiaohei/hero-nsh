import { expect, open, test } from "nsh/test";
import { callsOf } from "../../helpers/calls";
import type { ScenarioOptions } from "../../helpers/open-scenario";

/*
 * HeroUI 3.2.7 regression cases for ListBox, ListBoxItem and ListBoxSection
 * that need Tab to move the keyboard focus, per port sheet 4b (T-003).
 *
 * Why this file is `.web.`: NSH 0.4.0's Win32 host gives keyboard focus only to
 * an Input — Tab walks text fields, a click focuses only an Input, `ref.focus()`
 * on a view is a no-op and Return / Space do not activate a focused view
 * (`crates/nsh-platform-windows/src/input.rs:997-1053`, `mount.rs:440`;
 * `crates/nsh-core/src/props.rs:365`). These cases start with Tab on the
 * listbox, so a real Windows window cannot drive them. Approved difference
 * "Windows keyboard focus and activation (NSH 0.4.0 host gap)", port sheet
 * section 8. The pointer cases stay in the plain file; nothing here is hidden
 * on a target where it could work (macOS and the web both move focus with Tab).
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
