import { expect, open, test } from "nsh/test";
import { callsOf } from "../../helpers/calls";
import type { ScenarioOptions } from "../../helpers/open-scenario";
import { selectedOptions } from "../../testers/list-box";

/*
 * Kobalte 0.13.14 regression cases for ListBox that need Tab to move the
 * keyboard focus, ported to HeroUI's API and to NSH's view model, per port
 * sheet 4b (T-005, T-006, T-010 … T-012, T-014, T-021, T-022, the page keys and
 * X-003).
 *
 * Why this file is `.web.`: NSH 0.4.0's Win32 host gives keyboard focus only to
 * an Input — Tab walks text fields, a click focuses only an Input, `ref.focus()`
 * on a view is a no-op and Return / Space do not activate a focused view
 * (`crates/nsh-platform-windows/src/input.rs:997-1053`, `mount.rs:440`;
 * `crates/nsh-core/src/props.rs:365`). Every case here starts with Tab on the
 * listbox, so a real Windows window cannot drive them. Approved difference
 * "Windows keyboard focus and activation (NSH 0.4.0 host gap)", port sheet
 * section 8. The pointer cases stay in the plain file; nothing here is hidden
 * on a target where it could work (macOS and the web both move focus with Tab).
 *
 * Focus is virtual: the real focus stays on the listbox root, so the cases
 * read the focused row through the fixture's `Name*` marker instead of
 * `document.activeElement`.
 *
 * `aria-label` on the fixture's items keeps the accessible name equal to the
 * row text while the marker changes, so `role:option[Two]` keeps naming the
 * same row after focus moves.
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

/** Any text that ends with the fixture's focus marker. */
const FOCUS_MARKER = "text:/\\*$/";

// kobalte/packages/core/src/listbox/listbox.test.tsx:62
// Rewritten port (port sheet T-005): `document.activeElement` has no query, so
// the fixture shows the focused row with a `*` suffix. Each step also counts
// the markers, so a list that marks every row fails.
test("T-005 allows user to change option focus via up/down arrow keys", async () => {
  const app = await openFixture("log", { platform: "web" });

  await app.keyboard.press("tab");
  expect(app.shows("text:One*")).toBe(true);
  expect(app.count(FOCUS_MARKER)).toBe(1);

  await app.keyboard.press("arrowdown");
  expect(app.shows("text:Two*")).toBe(true);
  expect(app.count(FOCUS_MARKER)).toBe(1);

  await app.keyboard.press("arrowup");
  expect(app.shows("text:One*")).toBe(true);
  expect(app.count(FOCUS_MARKER)).toBe(1);
});

// kobalte/packages/core/src/listbox/listbox.test.tsx:91
// Rewritten port (port sheet T-006): same marker as T-005, with
// shouldFocusWrap. Without wrapping the last step would stay on Three and the
// final assertion fails.
test("T-006 wraps focus from last to first and first to last with shouldFocusWrap", async () => {
  const app = await openFixture("log-wrap", { platform: "web" });

  await app.keyboard.press("tab");
  expect(app.shows("text:One*")).toBe(true);

  await app.keyboard.press("arrowup");
  expect(app.shows("text:Three*")).toBe(true);
  expect(app.count(FOCUS_MARKER)).toBe(1);

  await app.keyboard.press("arrowdown");
  expect(app.shows("text:One*")).toBe(true);
  expect(app.count(FOCUS_MARKER)).toBe(1);
});

// kobalte/packages/core/src/listbox/listbox.test.tsx:233
// Ported (port sheet T-010): the uncontrolled default selection both focuses
// Two on Tab and marks it selected, without a selection callback.
test("T-010 supports defaultValue (uncontrolled)", async () => {
  const app = await openFixture("default-selected", { platform: "web" });

  await app.keyboard.press("tab");

  expect(app.shows("text:Two*")).toBe(true);
  expect(app.count("role:option[Two] >> text:✓")).toBe(1);
  expect(callsOf(app, "selectionChange")).toHaveLength(0);
});

// kobalte/packages/core/src/listbox/listbox.test.tsx:259
// Ported (port sheet T-011): the controlled value does not write back. Upstream
// pressed Enter on the next option; here Enter is sent to the root (the item
// is not a focus station) after the arrow key moved the highlight.
test("T-011 supports value (controlled)", async () => {
  const app = await openFixture("controlled", { platform: "web" });

  await app.keyboard.press("tab");
  expect(app.shows("text:Two*")).toBe(true);

  await app.keyboard.press("arrowdown");
  expect(app.shows("text:Three*")).toBe(true);

  await app.keyboard.press("enter");

  const changes = callsOf(app, "selectionChange");

  expect(changes).toHaveLength(1);
  expect(changes[0][0]).toEqual(["3"]);
  expect(app.count("role:option[Two] >> text:✓")).toBe(1);
  expect(app.count("role:option[Three] >> text:✓")).toBe(0);
  expect(app.shows("text:Three*")).toBe(true);
});

// kobalte/packages/core/src/listbox/listbox.test.tsx:300
// Ported (port sheet T-012): Space on the focused row is a native press on the
// root on web; the root routes it to the focused item.
test("T-012 supports using space key to change option selection", async () => {
  const app = await openFixture("log", { platform: "web" });

  await app.keyboard.press("tab");
  await app.keyboard.press("arrowdown");
  await app.keyboard.press("arrowdown");
  expect(app.shows("text:Three*")).toBe(true);

  await app.keyboard.press("space");

  expect(app.count("role:option[Three] >> text:✓")).toBe(1);

  const changes = callsOf(app, "selectionChange");

  expect(changes).toHaveLength(1);
  expect(changes[0][0]).toEqual(["3"]);
});

// kobalte/packages/core/src/listbox/listbox.test.tsx:375
// Partial port (port sheet T-014): aria-disabled has no channel; the press
// rejection, the empty callback log and the skipped row are kept. The second
// instance adds RAC's disabledBehavior="selection": the disabled row can still
// take focus and presses, only selection is blocked.
test("T-014 supports disabled options", async () => {
  const app = await openFixture("disabled", { platform: "web" });

  await expect(app.press("role:option[Two]")).rejects.toMatchObject({
    code: "ERR_NSH_TEST_DISABLED",
  });
  expect(callsOf(app, "selectionChange")).toHaveLength(0);

  await app.keyboard.press("tab");
  expect(app.shows("text:One*")).toBe(true);

  await app.keyboard.press("arrowdown");
  expect(app.shows("text:Three*")).toBe(true);

  const behavior = await openFixture("disabled-selection", { platform: "web" });

  await behavior.keyboard.press("tab");
  expect(behavior.shows("text:One*")).toBe(true);

  await behavior.keyboard.press("arrowdown");
  expect(behavior.shows("text:Two*")).toBe(true);
  expect(behavior.enabled("role:option[Two]")).toBe(true);

  await behavior.press("role:option[Two]");
  expect(callsOf(behavior, "selectionChange")).toHaveLength(0);
  expect(callsOf(behavior, "onAction")).toEqual([["2"]]);
});

// kobalte/packages/core/src/listbox/listbox.test.tsx:733
// Ported (port sheet T-021): the manual clock runs past the 500 ms typeahead
// window between the two keys, so a search string that is not reset fails.
test("T-021 supports type to select", async () => {
  const app = await openFixture("typeahead", { platform: "web", clock: {} });

  await app.keyboard.press("tab");
  expect(app.shows("text:One*")).toBe(true);

  await app.keyboard.press("t");
  expect(app.shows("text:Two*")).toBe(true);

  await app.clock!.runFor(500);

  await app.keyboard.press("o");
  expect(app.shows("text:One*")).toBe(true);
  expect(app.count(FOCUS_MARKER)).toBe(1);
});

// kobalte/packages/core/src/listbox/listbox.test.tsx:764
// Rewritten port (port sheet T-022): upstream pressed the same key twice, which
// proves nothing about the reset. The sequence is `t`, a 500 ms wait, `o`: a
// search string that survives would be "to" and match no row.
test("T-022 resets the search text after a timeout", async () => {
  const app = await openFixture("typeahead", { platform: "web", clock: {} });

  await app.keyboard.press("tab");
  await app.keyboard.press("t");
  expect(app.shows("text:Two*")).toBe(true);

  await app.clock!.runFor(500);

  await app.keyboard.press("o");

  expect(app.shows("text:One*")).toBe(true);
  expect(app.count(FOCUS_MARKER)).toBe(1);
});

// kobalte/packages/core/src/list/list-keyboard-delegate.ts:90-135
// Finding fix: the page keys had no component-level case. Ten 40 pt rows in a
// 160 pt box make one page four rows: PageDown from One lands on Four and
// PageUp returns to One. A delegate without item or container bounds returns
// nothing, so the focus would stay on One.
test("PageDown and PageUp move focus by one page", async () => {
  const app = await openFixture("paged", { platform: "web" });

  await app.keyboard.press("tab");
  expect(app.shows("text:One*")).toBe(true);

  await app.keyboard.press("pagedown");
  expect(app.shows("text:Four*")).toBe(true);
  expect(app.count(FOCUS_MARKER)).toBe(1);

  await app.keyboard.press("pageup");
  expect(app.shows("text:One*")).toBe(true);
  expect(app.count(FOCUS_MARKER)).toBe(1);
});

// kobalte/packages/core/src/selection/create-selectable-collection.ts:157-158,265-268,317
// X-003: the modifiers of a key press reach the collection. Shift+ArrowDown
// extends the multiple selection from the focused row; Ctrl+A selects every
// row. Dropping the modifiers makes both steps plain navigation with no
// selection.
test("X-003 extends the selection with shift and selects all with ctrl+a", async () => {
  const app = await openFixture("modified", { platform: "web" });

  await app.keyboard.press("tab");

  expect(app.shows("text:One*")).toBe(true);
  expect(selectedOptions(app)).toBe(0);

  await app.keyboard.press("shift+arrowdown");

  expect(app.shows("text:Two*")).toBe(true);
  expect(app.count("role:option[Two] >> text:✓")).toBe(1);
  expect(selectedOptions(app)).toBe(1);

  await app.keyboard.press("shift+arrowdown");

  expect(app.shows("text:Three*")).toBe(true);
  expect(app.count("role:option[Two] >> text:✓")).toBe(1);
  expect(app.count("role:option[Three] >> text:✓")).toBe(1);
  expect(selectedOptions(app)).toBe(2);

  await app.keyboard.press("ctrl+a");

  expect(selectedOptions(app)).toBe(4);
});
