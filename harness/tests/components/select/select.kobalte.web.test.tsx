import { expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";
import type { ScenarioOptions } from "../../helpers/open-scenario";
import * as select from "../../testers/select";

/*
 * Kobalte 0.13.14 Select regressions that need keyboard focus, highlight
 * movement or focus restoration, ported to HeroUI's API and to NSH's view
 * model, per port sheet 4b (T-038 … T-047, T-049 … T-052, T-059 … T-078, T-083).
 *
 * Why this file is `.web.`: NSH 0.4.0's Win32 host gives keyboard focus only to
 * an Input — Tab walks text fields, a click focuses only an Input, `ref.focus()`
 * on a view is a no-op and Return / Space do not activate a focused view
 * (`crates/nsh-platform-windows/src/input.rs:997-1053`, `mount.rs:440`;
 * `crates/nsh-core/src/props.rs:365`). Every case here tabs to the trigger,
 * relies on the list taking code focus when it opens, or reads where focus
 * ended, so a real Windows window cannot drive it (approved difference,
 * port sheet section 8). Nothing is hidden on macOS or the web.
 *
 * Kobalte asserts `document.activeElement`: the highlighted row is read through
 * the fixture's `*` marker and the focused list root through its `onFocus`
 * probe. Kobalte's callback payload is the item object; HeroUI's is the key, so
 * the payload assertions name keys (`"3"`, `["1", "3"]`). The aria assertions
 * (`aria-expanded`, `aria-controls`, `aria-selected`, `aria-multiselectable`,
 * `aria-disabled`) have no channel and are named in the sheet's 部分移植 rows.
 */

function openCase(name: string, options_: ScenarioOptions = {}) {
  const { params, ...rest } = options_;

  return open("../../../select.fixtures.tsx", {
    platform: "web",
    width: 1024,
    height: 768,
    clock: {},
    ...rest,
    host: { params: { case: name, ...params } },
  });
}

/** Runs past the 100 ms exit hold. */
async function settle(app: App): Promise<void> {
  await app.clock!.runFor(120);
}

// kobalte/packages/core/src/select/select.test.tsx:879
// Partial port (port sheet T-038): opening by press is kept together with the
// `true` payload, the three rows and the list taking focus. The aria-expanded
// and aria-controls assertions are dropped.
test("T-038 opens on a press and focuses the list", async () => {
  const app = await openCase("items");

  expect(select.getListbox(app)).toBe(false);

  await select.open(app);

  expect(select.getListbox(app)).toBe(true);
  expect(callsOf(app, "openChange")).toEqual([[true]]);
  expect(app.shows("role:option[One]")).toBe(true);
  expect(app.shows("role:option[Two]")).toBe(true);
  expect(app.shows("role:option[Three]")).toBe(true);
  expect(callsOf(app, "listFocus").length).toBeGreaterThan(0);
});

// kobalte/packages/core/src/select/select.test.tsx:949
// Partial port (port sheet T-039): NSH has one press source, so the kept half
// is the same as T-038: the list opens on the release, reports `true`, shows
// the three rows and takes focus. Kobalte's touch timing (down does not open,
// up does) has no step.
test("T-039 opens on the release of the press", async () => {
  const app = await openCase("items");

  expect(select.getListbox(app)).toBe(false);

  await select.open(app);

  expect(select.getListbox(app)).toBe(true);
  expect(callsOf(app, "openChange")).toEqual([[true]]);
  expect(app.shows("role:option[One]")).toBe(true);
  expect(app.shows("role:option[Two]")).toBe(true);
  expect(app.shows("role:option[Three]")).toBe(true);
  expect(callsOf(app, "listFocus").length).toBeGreaterThan(0);
});

// kobalte/packages/core/src/select/select.test.tsx:1029
// Partial port (port sheet T-040): Space opens and the first row is focused.
test("T-040 opens on Space and focuses the first item", async () => {
  const app = await openCase("items");

  await app.keyboard.press("tab");
  await app.keyboard.press("space");

  expect(select.getListbox(app)).toBe(true);
  expect(callsOf(app, "openChange")).toEqual([[true]]);
  expect(app.shows("role:option[One]")).toBe(true);
  expect(app.shows("role:option[Two]")).toBe(true);
  expect(app.shows("role:option[Three]")).toBe(true);
  expect(select.isFocusedOption(app, "One")).toBe(true);
});

// kobalte/packages/core/src/select/select.test.tsx:1086
// Partial port (port sheet T-041): Enter opens and the first row is focused.
test("T-041 opens on Enter and focuses the first item", async () => {
  const app = await openCase("items");

  await app.keyboard.press("tab");
  await app.keyboard.press("enter");

  expect(select.getListbox(app)).toBe(true);
  expect(callsOf(app, "openChange")).toEqual([[true]]);
  expect(app.shows("role:option[One]")).toBe(true);
  expect(app.shows("role:option[Two]")).toBe(true);
  expect(app.shows("role:option[Three]")).toBe(true);
  expect(select.isFocusedOption(app, "One")).toBe(true);
});

// kobalte/packages/core/src/select/select.test.tsx:1143
// Partial port (port sheet T-042): ArrowDown opens on the first row.
test("T-042 opens on ArrowDown and focuses the first item", async () => {
  const app = await openCase("items");

  await app.keyboard.press("tab");
  await app.keyboard.press("arrowdown");

  expect(select.getListbox(app)).toBe(true);
  expect(callsOf(app, "openChange")).toEqual([[true]]);
  expect(app.shows("role:option[One]")).toBe(true);
  expect(app.shows("role:option[Two]")).toBe(true);
  expect(app.shows("role:option[Three]")).toBe(true);
  expect(select.isFocusedOption(app, "One")).toBe(true);
});

// kobalte/packages/core/src/select/select.test.tsx:1200
// Partial port (port sheet T-043): ArrowUp opens and lands on the last row; a
// `focusStrategy` that ignores the direction leaves One highlighted.
test("T-043 opens on ArrowUp and focuses the last item", async () => {
  const app = await openCase("items");

  await app.keyboard.press("tab");
  await app.keyboard.press("arrowup");

  expect(select.getListbox(app)).toBe(true);
  expect(callsOf(app, "openChange")).toEqual([[true]]);
  expect(app.shows("role:option[One]")).toBe(true);
  expect(app.shows("role:option[Two]")).toBe(true);
  expect(app.shows("role:option[Three]")).toBe(true);
  expect(select.isFocusedOption(app, "Three")).toBe(true);
});

// kobalte/packages/core/src/select/select.test.tsx:1257
// Partial port (port sheet T-044): the focus walk is kept with markers, one at
// a time; the two aria assertions are dropped.
test("T-044 changes the focused item with the arrow keys", async () => {
  const app = await openCase("items");

  await app.keyboard.press("tab");
  await app.keyboard.press("arrowdown");

  expect(select.isFocusedOption(app, "One")).toBe(true);

  await app.keyboard.press("arrowdown");

  expect(select.isFocusedOption(app, "Two")).toBe(true);
  expect(app.count(select.FOCUS_MARKERS)).toBe(1);

  await app.keyboard.press("arrowdown");

  expect(select.isFocusedOption(app, "Three")).toBe(true);
  expect(app.count(select.FOCUS_MARKERS)).toBe(1);

  await app.keyboard.press("arrowup");

  expect(select.isFocusedOption(app, "Two")).toBe(true);
  expect(app.count(select.FOCUS_MARKERS)).toBe(1);
});

// kobalte/packages/core/src/select/select.test.tsx:1332
// Partial port (port sheet T-045): a controlled open list shows at mount, does
// not report an open change, lists the rows and holds the focus.
test("T-045 supports a controlled open state", async () => {
  const app = await openCase("items-open");

  expect(select.getListbox(app)).toBe(true);
  expect(callsOf(app, "openChange")).toHaveLength(0);
  expect(app.shows("role:option[One]")).toBe(true);
  expect(app.shows("role:option[Two]")).toBe(true);
  expect(app.shows("role:option[Three]")).toBe(true);
  expect(callsOf(app, "listFocus").length).toBeGreaterThan(0);
});

// kobalte/packages/core/src/select/select.test.tsx:1386
// Partial port (port sheet T-046): `defaultOpen` behaves the same at mount.
test("T-046 supports a default open state", async () => {
  const app = await openCase("items-default-open");

  expect(select.getListbox(app)).toBe(true);
  expect(callsOf(app, "openChange")).toHaveLength(0);
  expect(app.shows("role:option[One]")).toBe(true);
  expect(app.shows("role:option[Two]")).toBe(true);
  expect(app.shows("role:option[Three]")).toBe(true);
  expect(callsOf(app, "listFocus").length).toBeGreaterThan(0);
});

// kobalte/packages/core/src/select/select.test.tsx:1442
// Partial port (port sheet T-047): the second press on the trigger closes (the
// modal underlay reports it as an outside press), `openChange` runs twice with
// the second false, and the focus goes back to the trigger.
test("T-047 closes when the trigger is pressed again", async () => {
  const app = await openCase("items");

  await select.open(app);
  expect(select.getListbox(app)).toBe(true);

  await app.press(select.SELECT_TRIGGER);
  await settle(app);

  expect(select.getListbox(app)).toBe(false);

  const changes = callsOf(app, "openChange");

  expect(changes).toHaveLength(2);
  expect(changes[1][0]).toBe(false);
  expect(select.endsOnTrigger(app)).toBe(true);
});

// kobalte/packages/core/src/select/select.test.tsx:1600
// Partial port (port sheet T-049): Escape with the list focused closes it,
// reports false and returns the focus. It must not clear the selection, which
// T-063 pins separately.
test("T-049 closes on Escape and returns the focus", async () => {
  const app = await openCase("items");

  await select.open(app);
  expect(select.getListbox(app)).toBe(true);

  await app.keyboard.press("escape");
  await settle(app);

  expect(select.getListbox(app)).toBe(false);

  const closes = callsOf(app, "openChange").filter((args) => args[0] === false);

  expect(closes).toHaveLength(1);
  expect(select.endsOnTrigger(app)).toBe(true);
});

// kobalte/packages/core/src/select/select.test.tsx:1666
// Partial port (port sheet T-050): with `isOpen` held true, Escape reports
// false once and the list stays on screen (the controlled value does not write
// back).
test("T-050 does not close in a controlled open state", async () => {
  const app = await openCase("items-open");

  expect(select.getListbox(app)).toBe(true);

  await app.keyboard.press("escape");
  await settle(app);

  expect(select.getListbox(app)).toBe(true);
  expect(callsOf(app, "openChange")).toEqual([[false]]);
});

// kobalte/packages/core/src/select/select.test.tsx:1717
// Partial port (port sheet T-051): `defaultOpen` closes on Escape and reports
// false.
test("T-051 closes in a default open state", async () => {
  const app = await openCase("items-default-open");

  expect(select.getListbox(app)).toBe(true);

  await app.keyboard.press("escape");
  await settle(app);

  expect(select.getListbox(app)).toBe(false);

  const closes = callsOf(app, "openChange").filter((args) => args[0] === false);

  expect(closes).toHaveLength(1);
});

// kobalte/packages/core/src/select/select.test.tsx:1772
// Ported (port sheet T-052): a press on the Label focuses the trigger through
// `FieldContext.focusField` -> `triggerRef.focus()`, so the trigger's onFocus
// probe fires. Code focus only works on macOS and the web, hence `.web`.
test("T-052 focuses the trigger when the label is pressed", async () => {
  const app = await openCase("items");

  await app.press("text:Label");

  expect(callsOf(app, "triggerFocus")).toHaveLength(1);
});

// kobalte/packages/core/src/select/select.test.tsx:2104
// Rewritten port (port sheet T-059): Kobalte's payload is the item object;
// HeroUI's is the key `"3"`. Every other assertion is kept: the press opens and
// focuses the list, three rows, one callback, the list closes, the focus comes
// back and the trigger reads Three.
test("T-059 selects an item on press", async () => {
  const app = await openCase("items");

  expect(select.triggerShows(app, "Placeholder")).toBe(true);

  await select.open(app);

  expect(callsOf(app, "listFocus").length).toBeGreaterThan(0);
  expect(select.getOptions(app)).toBe(3);
  expect(app.shows("role:option[One]")).toBe(true);
  expect(app.shows("role:option[Two]")).toBe(true);
  expect(app.shows("role:option[Three]")).toBe(true);

  await app.press("role:option[Three]");
  await settle(app);

  const changes = callsOf(app, "selectionChange");

  expect(changes).toHaveLength(1);
  expect(changes[0][0]).toBe("3");
  expect(select.getListbox(app)).toBe(false);
  expect(select.endsOnTrigger(app)).toBe(true);
  expect(select.triggerShows(app, "Three")).toBe(true);
});

// kobalte/packages/core/src/select/select.test.tsx:2190
// Rewritten port (port sheet T-060): Space on the focused row selects it; the
// payload is the key `"1"`.
test("T-060 selects an item with the Space key", async () => {
  const app = await openCase("items");

  expect(select.triggerShows(app, "Placeholder")).toBe(true);

  await select.open(app);

  expect(callsOf(app, "listFocus").length).toBeGreaterThan(0);
  expect(select.getOptions(app)).toBe(3);
  expect(app.shows("role:option[One]")).toBe(true);
  expect(app.shows("role:option[Two]")).toBe(true);
  expect(app.shows("role:option[Three]")).toBe(true);

  await app.keyboard.press("arrowdown");

  expect(select.isFocusedOption(app, "One")).toBe(true);

  await app.keyboard.press("space");
  await settle(app);

  const changes = callsOf(app, "selectionChange");

  expect(changes).toHaveLength(1);
  expect(changes[0][0]).toBe("1");
  expect(select.getListbox(app)).toBe(false);
  expect(select.endsOnTrigger(app)).toBe(true);
  expect(select.triggerShows(app, "One")).toBe(true);
});

// kobalte/packages/core/src/select/select.test.tsx:2269
// Rewritten port (port sheet T-061): ArrowUp opens on the last row, a second
// ArrowUp moves to Two, Enter selects it; the payload is the key `"2"`.
test("T-061 selects an item with the Enter key", async () => {
  const app = await openCase("items");

  expect(select.triggerShows(app, "Placeholder")).toBe(true);

  await app.keyboard.press("tab");
  await app.keyboard.press("arrowup");

  expect(select.getOptions(app)).toBe(3);
  expect(app.shows("role:option[One]")).toBe(true);
  expect(app.shows("role:option[Two]")).toBe(true);
  expect(app.shows("role:option[Three]")).toBe(true);
  expect(select.isFocusedOption(app, "Three")).toBe(true);

  await app.keyboard.press("arrowup");

  expect(select.isFocusedOption(app, "Two")).toBe(true);

  await app.keyboard.press("enter");
  await settle(app);

  const changes = callsOf(app, "selectionChange");

  expect(changes).toHaveLength(1);
  expect(changes[0][0]).toBe("2");
  expect(select.getListbox(app)).toBe(false);
  expect(select.endsOnTrigger(app)).toBe(true);
  expect(select.triggerShows(app, "Two")).toBe(true);
});

// kobalte/packages/core/src/select/select.test.tsx:2341
// Rewritten port (port sheet T-062): the pointer move becomes `app.hover` on
// the row, read through the `*` marker (Kobalte reads activeElement). The rest
// is kept: one marker, ArrowDown to Three, Enter selects `"3"`, the list closes,
// the focus returns and the value reads Three. Hover-to-highlight depends on the
// owner contract's `shouldFocusOnHover`.
test("T-062 focuses an item on hover", async () => {
  const app = await openCase("items");

  expect(select.triggerShows(app, "Placeholder")).toBe(true);

  await select.open(app);

  expect(callsOf(app, "listFocus").length).toBeGreaterThan(0);
  expect(select.getOptions(app)).toBe(3);
  expect(app.shows("role:option[One]")).toBe(true);
  expect(app.shows("role:option[Two]")).toBe(true);
  expect(app.shows("role:option[Three]")).toBe(true);

  await app.hover("role:option[Two]");

  expect(select.isFocusedOption(app, "Two")).toBe(true);
  expect(app.count(select.FOCUS_MARKERS)).toBe(1);

  await app.keyboard.press("arrowdown");

  expect(select.isFocusedOption(app, "Three")).toBe(true);

  await app.keyboard.press("enter");
  await settle(app);

  const changes = callsOf(app, "selectionChange");

  expect(changes).toHaveLength(1);
  expect(changes[0][0]).toBe("3");
  expect(select.getListbox(app)).toBe(false);
  expect(select.endsOnTrigger(app)).toBe(true);
  expect(select.triggerShows(app, "Three")).toBe(true);
});

// kobalte/packages/core/src/select/select.test.tsx:2438
// Partial port (port sheet T-063): select Three, reopen and press Escape. The
// selection callback stays at one, the value stays Three, the list closes and
// the focus returns. `aria-labelledby` is dropped.
test("T-063 does not clear the selection when Escape closes the listbox", async () => {
  const app = await openCase("items");

  await select.open(app);
  await app.press("role:option[Three]");
  await settle(app);

  expect(callsOf(app, "selectionChange")).toHaveLength(1);

  await select.open(app);
  expect(select.getListbox(app)).toBe(true);

  await app.keyboard.press("escape");
  await settle(app);

  expect(callsOf(app, "selectionChange")).toHaveLength(1);
  expect(select.getListbox(app)).toBe(false);
  expect(select.endsOnTrigger(app)).toBe(true);
  expect(select.triggerShows(app, "Three")).toBe(true);
});

// kobalte/packages/core/src/select/select.test.tsx:2548
// Partial port (port sheet T-064): a controlled Two opens highlighted, ArrowUp
// moves to One, Enter reports `"1"`, the list closes, the focus returns and the
// value stays Two (the controlled value does not write back). `aria-selected`
// is dropped; the marker and the value carry it.
test("T-064 supports a controlled selection", async () => {
  const app = await openCase("items-controlled");

  expect(select.triggerShows(app, "Two")).toBe(true);

  await select.open(app);

  expect(select.isFocusedOption(app, "Two")).toBe(true);

  await app.keyboard.press("arrowup");

  expect(select.isFocusedOption(app, "One")).toBe(true);

  await app.keyboard.press("enter");
  await settle(app);

  const changes = callsOf(app, "selectionChange");

  expect(changes).toHaveLength(1);
  expect(changes[0][0]).toBe("1");
  expect(select.getListbox(app)).toBe(false);
  expect(select.endsOnTrigger(app)).toBe(true);
  expect(select.triggerShows(app, "Two")).toBe(true);
});

// kobalte/packages/core/src/select/select.test.tsx:2628
// Partial port (port sheet T-065): the same controlled flow, then the
// ClearButton (HeroUI's counterpart of Kobalte's external button) clears it:
// the value returns to the placeholder and the callback reports null.
test("T-065 supports a controlled clear selection", async () => {
  const app = await openCase("items-controlled-clear");

  expect(select.triggerShows(app, "Two")).toBe(true);

  await select.open(app);

  expect(select.isFocusedOption(app, "Two")).toBe(true);

  await app.keyboard.press("arrowup");
  await app.keyboard.press("enter");
  await settle(app);

  let changes = callsOf(app, "selectionChange");

  expect(changes).toHaveLength(1);
  expect(changes[0][0]).toBe("1");
  expect(select.endsOnTrigger(app)).toBe(true);
  expect(select.triggerShows(app, "Two")).toBe(true);

  await app.press(select.getClearButton(app));
  await settle(app);

  changes = callsOf(app, "selectionChange");

  expect(changes).toHaveLength(2);
  expect(changes[1][0]).toBeNull();
  expect(callsOf(app, "clear")).toHaveLength(1);
  expect(select.triggerShows(app, "Placeholder")).toBe(true);
});

// kobalte/packages/core/src/select/select.test.tsx:2728
// Partial port (port sheet T-066): a default Two opens highlighted, ArrowUp
// moves to One, Enter reports `"1"`, the list closes, the focus returns and the
// value reads One. `aria-selected` is dropped.
test("T-066 supports a default selection", async () => {
  const app = await openCase("items-default-two");

  expect(select.triggerShows(app, "Two")).toBe(true);

  await select.open(app);

  expect(select.isFocusedOption(app, "Two")).toBe(true);

  await app.keyboard.press("arrowup");

  expect(select.isFocusedOption(app, "One")).toBe(true);

  await app.keyboard.press("enter");
  await settle(app);

  const changes = callsOf(app, "selectionChange");

  expect(changes).toHaveLength(1);
  expect(changes[0][0]).toBe("1");
  expect(select.getListbox(app)).toBe(false);
  expect(select.endsOnTrigger(app)).toBe(true);
  expect(select.triggerShows(app, "One")).toBe(true);
});

// kobalte/packages/core/src/select/select.test.tsx:2808
// Partial port (port sheet T-067): the root's `disabledKeys` reaches the list
// through the owner contract; two ArrowDowns skip Two and land on Three, Enter
// reports `"3"`, the list closes, the focus returns and the value reads Three.
// `aria-disabled` is dropped.
test("T-067 skips disabled items", async () => {
  const app = await openCase("items-disabled-keys");

  await select.open(app);

  await app.keyboard.press("arrowdown");

  expect(select.isFocusedOption(app, "One")).toBe(true);

  await app.keyboard.press("arrowdown");

  expect(select.isFocusedOption(app, "Three")).toBe(true);

  await app.keyboard.press("enter");
  await settle(app);

  const changes = callsOf(app, "selectionChange");

  expect(changes).toHaveLength(1);
  expect(changes[0][0]).toBe("3");
  expect(select.getListbox(app)).toBe(false);
  expect(select.endsOnTrigger(app)).toBe(true);
  expect(select.triggerShows(app, "Three")).toBe(true);
});

// kobalte/packages/core/src/select/select.test.tsx:2900
// Rewritten port (port sheet T-068): typeahead inside the open list. `t` lands
// on Two, `h` extends the search to Three and Enter reports `"3"`; reopening
// keeps Three focused, `f` lands on Four and Enter reports `"4"`. Focus moves
// are read with markers instead of activeElement; the payload is the key.
test("T-068 supports type to select", async () => {
  const app = await openCase("items-four");

  expect(select.triggerShows(app, "Placeholder")).toBe(true);

  // Upstream focuses the trigger and opens with ArrowDown, which lands on the
  // first row; a pointer open would focus only the list root (Kobalte T-059).
  await app.keyboard.press("tab");
  await app.keyboard.press("arrowdown");

  expect(select.getOptions(app)).toBe(4);
  expect(app.shows("role:option[One]")).toBe(true);
  expect(app.shows("role:option[Two]")).toBe(true);
  expect(app.shows("role:option[Three]")).toBe(true);
  expect(app.shows("role:option[Four]")).toBe(true);
  expect(select.isFocusedOption(app, "One")).toBe(true);

  await app.keyboard.press("t");

  expect(select.isFocusedOption(app, "Two")).toBe(true);
  expect(app.count(select.FOCUS_MARKERS)).toBe(1);

  await app.keyboard.press("h");

  expect(select.isFocusedOption(app, "Three")).toBe(true);

  await app.keyboard.press("enter");
  await settle(app);

  let changes = callsOf(app, "selectionChange");

  expect(changes).toHaveLength(1);
  expect(changes[0][0]).toBe("3");
  expect(select.getListbox(app)).toBe(false);
  expect(select.triggerShows(app, "Three")).toBe(true);

  // Upstream focuses the trigger and reopens with ArrowDown, which lands on the
  // selected row; the focus is already on the trigger after the close.
  await app.keyboard.press("arrowdown");

  expect(select.isFocusedOption(app, "Three")).toBe(true);

  await app.keyboard.press("f");

  expect(select.isFocusedOption(app, "Four")).toBe(true);

  await app.keyboard.press("enter");
  await settle(app);

  changes = callsOf(app, "selectionChange");

  expect(changes).toHaveLength(2);
  expect(changes[1][0]).toBe("4");
  expect(select.getListbox(app)).toBe(false);
  expect(select.triggerShows(app, "Four")).toBe(true);
});

// kobalte/packages/core/src/select/select.test.tsx:3011
// Partial port (port sheet T-069): `disallowEmptySelection` and
// `allowDuplicateSelectionEvents` are injected through the owner contract.
// Pressing the selected Two still reports once with `"2"`, keeps Two and
// closes; the focus returns. `aria-selected` is dropped.
test("T-069 does not deselect a selected item when disallowEmptySelection is true", async () => {
  const app = await openCase("items-disallow-empty");

  expect(select.triggerShows(app, "Two")).toBe(true);

  await select.open(app);

  expect(select.isFocusedOption(app, "Two")).toBe(true);

  await app.press("role:option[Two]");
  await settle(app);

  const changes = callsOf(app, "selectionChange");

  expect(changes).toHaveLength(1);
  expect(changes[0][0]).toBe("2");
  expect(select.triggerShows(app, "Two")).toBe(true);
  expect(select.getListbox(app)).toBe(false);
  expect(select.endsOnTrigger(app)).toBe(true);
});

// kobalte/packages/core/src/select/select.test.tsx:3086
// Ported (port sheet T-070): the closed trigger's own ArrowLeft / ArrowRight
// scope moves the selection through One, Two, Three and stops at the ends.
test("T-070 moves the selection with ArrowLeft and ArrowRight", async () => {
  const app = await openCase("items");

  await app.keyboard.press("tab");

  expect(select.triggerShows(app, "Placeholder")).toBe(true);

  await app.keyboard.press("arrowleft");

  expect(select.triggerShows(app, "One")).toBe(true);
  expect(callsOf(app, "selectionChange")).toHaveLength(1);

  await app.keyboard.press("arrowleft");

  expect(select.triggerShows(app, "One")).toBe(true);
  expect(callsOf(app, "selectionChange")).toHaveLength(1);

  await app.keyboard.press("arrowright");

  expect(select.triggerShows(app, "Two")).toBe(true);
  expect(callsOf(app, "selectionChange")).toHaveLength(2);

  await app.keyboard.press("arrowright");

  expect(select.triggerShows(app, "Three")).toBe(true);
  expect(callsOf(app, "selectionChange")).toHaveLength(3);

  await app.keyboard.press("arrowright");

  expect(select.triggerShows(app, "Three")).toBe(true);
  expect(callsOf(app, "selectionChange")).toHaveLength(3);

  await app.keyboard.press("arrowleft");

  expect(select.triggerShows(app, "Two")).toBe(true);
  expect(callsOf(app, "selectionChange")).toHaveLength(4);
});

// kobalte/packages/core/src/select/select.test.tsx:3158
// Partial port (port sheet T-071): the payload is `Set<Key>` upstream and
// `"all" | Set<Key>` here, so the two calls read `["1"]` and `["1", "3"]`
// (selectionBehavior "toggle"). The list stays open and the value is the
// ListFormat string. `aria-multiselectable` and both `aria-selected` are
// dropped. The value renders one span per element plus the literal segments,
// so the three pieces are asserted inside the trigger.
test("T-071 supports selecting multiple options", async () => {
  const app = await openCase("items-multiple");

  await select.open(app);

  expect(select.getOptions(app)).toBe(3);
  expect(app.shows("role:option[One]")).toBe(true);
  expect(app.shows("role:option[Three]")).toBe(true);

  await app.press("role:option[One]");
  await app.press("role:option[Three]");

  const changes = callsOf(app, "selectionChange");

  expect(changes).toHaveLength(2);
  expect(changes[0][0]).toEqual(["1"]);
  expect(changes[1][0]).toEqual(["1", "3"]);
  expect(select.getListbox(app)).toBe(true);

  expect(app.shows(`${select.SELECT_TRIGGER} >> text:/^One\\*?$/`)).toBe(true);
  expect(app.shows(`${select.SELECT_TRIGGER} >> text:/,/`)).toBe(true);
  expect(app.shows(`${select.SELECT_TRIGGER} >> text:/^Three\\*?$/`)).toBe(true);
});

// kobalte/packages/core/src/select/select.test.tsx:3271
// Partial port (port sheet T-072): the default selection {"1","2"} shows two
// marks; pressing Three reports one call holding all three keys. The three
// `aria-selected` assertions are dropped.
test("T-072 supports a multiple default selection", async () => {
  const app = await openCase("items-multiple-default");

  await select.open(app);

  expect(select.selectedOptions(app)).toBe(2);

  await app.press("role:option[Three]");

  const changes = callsOf(app, "selectionChange");

  expect(changes).toHaveLength(1);
  expect(changes[0][0]).toEqual(["1", "2", "3"]);
  expect(select.getListbox(app)).toBe(true);
});

// kobalte/packages/core/src/select/select.test.tsx:3355
// Partial port (port sheet T-073): a controlled {"1","2"} ignores the press on
// Three for display, reports one call that holds it, and stays without a mark
// on Three. The three `aria-selected` assertions are dropped.
test("T-073 supports a controlled multiple selection", async () => {
  const app = await openCase("items-multiple-controlled");

  await select.open(app);

  expect(select.selectedOptions(app)).toBe(2);

  await app.press("role:option[Three]");

  expect(app.count("role:option[Three] >> text:✓")).toBe(0);

  const changes = callsOf(app, "selectionChange");

  expect(changes).toHaveLength(1);
  expect(changes[0][0]).toEqual(["1", "2", "3"]);
});

// kobalte/packages/core/src/select/select.test.tsx:3433
// Partial port (port sheet T-074): selecting Three then One reports twice and
// the value keeps the selection order (Three, One); the list stays open.
test("T-074 keeps the selection order", async () => {
  const app = await openCase("items-multiple");

  await select.open(app);

  expect(select.getOptions(app)).toBe(3);

  await app.press("role:option[Three]");
  await app.press("role:option[One]");

  const changes = callsOf(app, "selectionChange");

  expect(changes).toHaveLength(2);
  expect(changes[0][0]).toEqual(["3"]);
  expect(changes[1][0]).toEqual(["3", "1"]);
  expect(select.getListbox(app)).toBe(true);

  expect(app.shows(`${select.SELECT_TRIGGER} >> text:/^Three\\*?$/`)).toBe(true);
  expect(app.shows(`${select.SELECT_TRIGGER} >> text:/,/`)).toBe(true);
  expect(app.shows(`${select.SELECT_TRIGGER} >> text:/^One\\*?$/`)).toBe(true);
});

// kobalte/packages/core/src/select/select.test.tsx:3546
// Partial port (port sheet T-075): pressing a selected option removes its mark
// and reports the remaining set. The three `aria-selected` assertions are
// dropped.
test("T-075 supports deselection", async () => {
  const app = await openCase("items-multiple-default");

  await select.open(app);

  expect(select.selectedOptions(app)).toBe(2);

  await app.press("role:option[One]");

  expect(select.selectedOptions(app)).toBe(1);

  const changes = callsOf(app, "selectionChange");

  expect(changes).toHaveLength(1);
  expect(changes[0][0]).toEqual(["2"]);
});

// kobalte/packages/core/src/select/select.test.tsx:3629
// Ported (port sheet T-076): with the trigger focused and the list closed, `t`
// selects Two and `h` selects Three. This only works while the list subtree
// stays mounted and registered while closed (port sheet section 5, third
// point).
test("T-076 selects by typing without opening the list", async () => {
  const app = await openCase("items");

  await app.keyboard.press("tab");

  expect(select.triggerShows(app, "Placeholder")).toBe(true);

  await app.keyboard.press("t");

  let changes = callsOf(app, "selectionChange");

  expect(changes).toHaveLength(1);
  expect(changes[0][0]).toBe("2");
  expect(select.triggerShows(app, "Two")).toBe(true);

  await app.keyboard.press("h");

  changes = callsOf(app, "selectionChange");

  expect(changes).toHaveLength(2);
  expect(changes[1][0]).toBe("3");
  expect(select.triggerShows(app, "Three")).toBe(true);
});

// kobalte/packages/core/src/select/select.test.tsx:3686
// Rewritten port (port sheet T-077): upstream's tail key `h` matches nothing
// before and after the reset, so it proves nothing. Here `o` differs by branch:
// with the search reset, "o" finds One; without it, "to" finds nothing. A
// manual clock crosses the 500 ms window.
test("T-077 resets the search text after the timeout", async () => {
  const app = await openCase("items");

  await app.keyboard.press("tab");

  expect(select.triggerShows(app, "Placeholder")).toBe(true);

  await app.keyboard.press("t");

  let changes = callsOf(app, "selectionChange");

  expect(changes).toHaveLength(1);
  expect(changes[0][0]).toBe("2");
  expect(select.triggerShows(app, "Two")).toBe(true);

  await app.clock!.runFor(500);

  await app.keyboard.press("o");

  changes = callsOf(app, "selectionChange");

  expect(changes).toHaveLength(2);
  expect(changes[1][0]).toBe("1");
  expect(select.triggerShows(app, "One")).toBe(true);
});

// kobalte/packages/core/src/select/select.test.tsx:3746
// Ported (port sheet T-078): after `t` selects Two, `o` ("to" with no match)
// falls back to "o" and wraps past the end to One. Without wrapping the
// selection stays Two.
test("T-078 wraps around when no item past the current one matches", async () => {
  const app = await openCase("items");

  await app.keyboard.press("tab");

  expect(select.triggerShows(app, "Placeholder")).toBe(true);

  await app.keyboard.press("t");

  let changes = callsOf(app, "selectionChange");

  expect(changes).toHaveLength(1);
  expect(changes[0][0]).toBe("2");
  expect(select.triggerShows(app, "Two")).toBe(true);

  await app.keyboard.press("o");

  changes = callsOf(app, "selectionChange");

  expect(changes).toHaveLength(2);
  expect(changes[1][0]).toBe("1");
  expect(select.triggerShows(app, "One")).toBe(true);
});

// kobalte/packages/core/src/select/select.test.tsx:4017
// Partial port (port sheet T-083): Tab skips the disabled trigger (the focus
// probe stays empty) and Space does not open it or report an open change.
// `aria-expanded` is dropped.
test("T-083 does not open on Space when disabled", async () => {
  const app = await openCase("items-disabled");

  await app.keyboard.press("tab");

  expect(callsOf(app, "triggerFocus")).toHaveLength(0);

  await app.keyboard.press("space");
  await settle(app);

  expect(select.getListbox(app)).toBe(false);
  expect(callsOf(app, "openChange")).toHaveLength(0);
});
