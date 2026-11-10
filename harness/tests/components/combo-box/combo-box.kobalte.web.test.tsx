import { expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";
import type { ScenarioOptions } from "../../helpers/open-scenario";
import * as combo from "../../testers/combo-box";

/*
 * Kobalte 0.13.14 ComboBox regressions that need keyboard focus, virtual focus
 * movement or focus restoration, ported to HeroUI's API and to NSH's view
 * model, per port sheet 4b (T-022 … T-026, T-029, T-031, T-039 … T-051, T-056).
 *
 * Why this file is `.web.`: NSH 0.4.0's Win32 host gives keyboard focus only to
 * an Input — Tab does not walk the fields, a pointer press does not focus a
 * view, and `ref.focus()` on a view is a no-op
 * (`crates/nsh-platform-windows/src/input.rs:997-1053`, `mount.rs:440`;
 * `crates/nsh-core/src/props.rs:365`). Every case here tabs to the field, sends
 * arrows to the focused input, or reads where focus ended (approved difference,
 * port sheet section 8).
 *
 * Kobalte's first 46 cases sit in a `describe.skip` upstream; they are still the
 * contract for this logic, so they are ported, not skipped. Its callback payload
 * is the item object and its `onOpenChange` carries `"manual"`; HeroUI's payload
 * is the key and RAC's arrow-key opens do not name a source, so the payload
 * assertions name keys and only the trigger-press case pins the second argument.
 */

function openCase(name: string, options_: ScenarioOptions = {}) {
  const { params, ...rest } = options_;

  return open("../../../combo-box.fixtures.tsx", {
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

// kobalte/packages/core/src/combobox/combobox.test.tsx:897
// Partial port (port sheet T-022): the manual trigger opens the list, reports
// `true` with the `"manual"` source once, shows the three rows and leaves focus
// in the input. `aria-expanded` / `aria-controls` are dropped.
test("T-022 opens on a press of the trigger", async () => {
  const app = await openCase("manual");

  expect(combo.getListbox(app)).toBe(false);

  await app.keyboard.press("tab");

  expect(combo.getListbox(app)).toBe(false);

  await combo.open(app);

  expect(combo.getListbox(app)).toBe(true);
  expect(callsOf(app, "openChange")).toEqual([[true, "manual"]]);
  expect(app.shows("role:option[One]")).toBe(true);
  expect(app.shows("role:option[Two]")).toBe(true);
  expect(app.shows("role:option[Three]")).toBe(true);
  expect(combo.endsOnInput(app)).toBe(true);
});

// kobalte/packages/core/src/combobox/combobox.test.tsx:971
// Partial port (port sheet T-023): NSH has one press source, so the kept half is
// the same as T-022: pressing the trigger opens, reports `true`, shows the three
// rows and leaves focus in the input. Kobalte's touch timing (down does not
// open, up does) has no step.
test("T-023 opens on the release of the press", async () => {
  const app = await openCase("manual");

  await app.keyboard.press("tab");

  expect(combo.getListbox(app)).toBe(false);

  await combo.open(app);

  expect(combo.getListbox(app)).toBe(true);
  expect(callsOf(app, "openChange")).toEqual([[true, "manual"]]);
  expect(app.shows("role:option[One]")).toBe(true);
  expect(app.shows("role:option[Two]")).toBe(true);
  expect(app.shows("role:option[Three]")).toBe(true);
  expect(combo.endsOnInput(app)).toBe(true);
});

// kobalte/packages/core/src/combobox/combobox.test.tsx:1052
// Partial port (port sheet T-024): ArrowDown on the focused input opens the list,
// reports `true` once, shows the three rows and highlights the first one. The
// aria assertions and activeElement are replaced by the marker and the probe.
test("T-024 opens on ArrowDown and highlights the first item", async () => {
  const app = await openCase("manual");

  await app.keyboard.press("tab");
  await app.keyboard.press("arrowdown");
  await app.waitFor(combo.COMBO_BOX_LISTBOX);

  const changes = callsOf(app, "openChange");

  expect(changes).toHaveLength(1);
  expect(changes[0][0]).toBe(true);
  expect(app.shows("role:option[One]")).toBe(true);
  expect(app.shows("role:option[Two]")).toBe(true);
  expect(app.shows("role:option[Three]")).toBe(true);
  expect(combo.isFocusedOption(app, "One")).toBe(true);
});

// kobalte/packages/core/src/combobox/combobox.test.tsx:1113
// Partial port (port sheet T-025): ArrowUp highlights the last item; a strategy
// that ignored the direction would fail here.
test("T-025 opens on ArrowUp and highlights the last item", async () => {
  const app = await openCase("manual");

  await app.keyboard.press("tab");
  await app.keyboard.press("arrowup");
  await app.waitFor(combo.COMBO_BOX_LISTBOX);

  const changes = callsOf(app, "openChange");

  expect(changes).toHaveLength(1);
  expect(changes[0][0]).toBe(true);
  expect(app.shows("role:option[One]")).toBe(true);
  expect(app.shows("role:option[Two]")).toBe(true);
  expect(app.shows("role:option[Three]")).toBe(true);
  expect(combo.isFocusedOption(app, "Three")).toBe(true);
});

// kobalte/packages/core/src/combobox/combobox.test.tsx:1170
// Partial port (port sheet T-026): the highlight walks One → Two → Three and
// back to Two, one marker at a time. `aria-activedescendant` and activeElement
// are dropped.
test("T-026 changes the highlighted item with the arrow keys", async () => {
  const app = await openCase("manual");

  await app.keyboard.press("tab");
  await app.keyboard.press("arrowdown");
  await app.waitFor(combo.COMBO_BOX_LISTBOX);

  expect(combo.isFocusedOption(app, "One")).toBe(true);

  await app.keyboard.press("arrowdown");
  await app.clock!.runFor(20);

  expect(combo.isFocusedOption(app, "Two")).toBe(true);
  expect(combo.focusedOptions(app)).toBe(1);

  await app.keyboard.press("arrowdown");
  await app.clock!.runFor(20);

  expect(combo.isFocusedOption(app, "Three")).toBe(true);
  expect(combo.focusedOptions(app)).toBe(1);

  await app.keyboard.press("arrowup");
  await app.clock!.runFor(20);

  expect(combo.isFocusedOption(app, "Two")).toBe(true);
  expect(combo.focusedOptions(app)).toBe(1);
});

// kobalte/packages/core/src/combobox/combobox.test.tsx:1351
// Partial port (port sheet T-029): a second trigger press closes the list,
// reports `false`, and focus is back in the input.
test("T-029 closes on a second press of the trigger", async () => {
  const app = await openCase("manual");

  await combo.open(app);
  await app.press(combo.COMBO_BOX_TRIGGER);
  await settle(app);

  expect(combo.getListbox(app)).toBe(false);
  expect(callsOf(app, "openChange").map((args) => args[0])).toEqual([true, false]);
  expect(combo.endsOnInput(app)).toBe(true);
});

// kobalte/packages/core/src/combobox/combobox.test.tsx:1510
// Partial port (port sheet T-031): Escape closes the open list, reports `false`,
// leaves focus in the input and keeps the selected item's text.
test("T-031 closes on Escape and keeps the selected text", async () => {
  const app = await openCase("default-key");

  await combo.open(app);

  expect(app.shows("role:option[Cat]")).toBe(true);

  await app.keyboard.press("escape");
  await settle(app);

  expect(combo.getListbox(app)).toBe(false);
  expect(callsOf(app, "openChange").map((args) => args[0])).toEqual([true, false]);
  expect(combo.endsOnInput(app)).toBe(true);
  expect(combo.inputValue(app)).toBe("Cat");
});

// kobalte/packages/core/src/combobox/combobox.test.tsx:1913
// Partial port (port sheet T-039): pressing Three reports the key `"3"`, closes
// the list, writes `Three` into the input and leaves focus there.
test("T-039 selects an item on press", async () => {
  const app = await openCase("manual");

  await combo.open(app);

  expect(combo.getOptions(app)).toBe(3);

  await combo.toggleOptionSelection(app, "Three");
  await settle(app);

  const changes = callsOf(app, "change");

  expect(changes).toHaveLength(1);
  expect(changes[0][0]).toBe("3");
  expect(combo.getListbox(app)).toBe(false);
  expect(combo.inputValue(app)).toBe("Three");
  expect(combo.endsOnInput(app)).toBe(true);
});

// kobalte/packages/core/src/combobox/combobox.test.tsx:2007
// Partial port (port sheet T-040): ArrowDown opens and highlights One, two more
// moves reach Three, Enter reports `"3"`, closes and writes `Three`.
test("T-040 selects an item with the Enter key", async () => {
  const app = await openCase("manual");

  await app.keyboard.press("tab");
  await app.keyboard.press("arrowdown");
  await app.waitFor(combo.COMBO_BOX_LISTBOX);
  await app.keyboard.press("arrowdown");
  await app.keyboard.press("arrowdown");
  await app.clock!.runFor(20);

  expect(combo.isFocusedOption(app, "Three")).toBe(true);

  await app.keyboard.press("enter");
  await settle(app);

  const changes = callsOf(app, "change");

  expect(changes).toHaveLength(1);
  expect(changes[0][0]).toBe("3");
  expect(combo.getListbox(app)).toBe(false);
  expect(combo.inputValue(app)).toBe("Three");
  expect(combo.endsOnInput(app)).toBe(true);
});

// kobalte/packages/core/src/combobox/combobox.test.tsx:2080
// Partial port (port sheet T-041): hovering Two moves the highlight to it
// (`shouldFocusOnHover`, which an independent ListBox does not enable), ArrowDown
// then reaches Three and Enter reports `"3"`. The aria-activedescendant and
// activeElement assertions are dropped.
test("T-041 highlights items on hover", async () => {
  const app = await openCase("manual");

  await app.keyboard.press("tab");
  await app.keyboard.press("arrowdown");
  await app.waitFor(combo.COMBO_BOX_LISTBOX);

  await app.hover("role:option[Two]");
  await app.clock!.runFor(20);

  expect(combo.isFocusedOption(app, "Two")).toBe(true);

  await app.keyboard.press("arrowdown");
  await app.clock!.runFor(20);

  expect(combo.isFocusedOption(app, "Three")).toBe(true);

  await app.keyboard.press("enter");
  await settle(app);

  const changes = callsOf(app, "change");

  expect(changes).toHaveLength(1);
  expect(changes[0][0]).toBe("3");
  expect(combo.getListbox(app)).toBe(false);
  expect(combo.inputValue(app)).toBe("Three");
});

// kobalte/packages/core/src/combobox/combobox.test.tsx:2177
// Partial port (port sheet T-042): Escape closes without clearing the selection —
// one change callback, `Three` still in the input, focus back in it.
test("T-042 does not clear the selection when Escape closes the list", async () => {
  const app = await openCase("manual");

  await combo.open(app);
  await combo.toggleOptionSelection(app, "Three");
  await settle(app);

  expect(callsOf(app, "change")).toHaveLength(1);

  await combo.open(app);
  await app.keyboard.press("escape");
  await settle(app);

  expect(callsOf(app, "change")).toHaveLength(1);
  expect(combo.getListbox(app)).toBe(false);
  expect(combo.inputValue(app)).toBe("Three");
  expect(combo.endsOnInput(app)).toBe(true);
});

// kobalte/packages/core/src/combobox/combobox.test.tsx:2286
// Partial port (port sheet T-043): the kept half is the closed-state Escape —
// text and selection stay where they are. Kobalte clears both; RAC's Escape only
// acts while open, HeroUI wins (port sheet section 8).
test("T-043 keeps text and selection on Escape while closed", async () => {
  const app = await openCase("manual");

  await combo.open(app);
  await combo.toggleOptionSelection(app, "Three");
  await settle(app);

  await app.keyboard.press("escape");
  await settle(app);

  expect(callsOf(app, "change")).toHaveLength(1);
  expect(combo.getListbox(app)).toBe(false);
  expect(combo.inputValue(app)).toBe("Three");
});

// kobalte/packages/core/src/combobox/combobox.test.tsx:2403
// Partial port (port sheet T-044): the controlled `value` shows Two, opening
// highlights it, ArrowUp reaches One, Enter reports `"1"`, closes, and the input
// still reads Two (the parent did not write back).
test("T-044 supports controlled selection", async () => {
  const app = await openCase("controlled-key");

  expect(combo.inputValue(app)).toBe("Two");

  await combo.open(app);

  expect(combo.getOptions(app)).toBe(3);
  expect(combo.isFocusedOption(app, "Two")).toBe(true);
  expect(combo.isSelectedOption(app, "Two")).toBe(true);

  await app.keyboard.press("arrowup");
  await app.clock!.runFor(20);

  expect(combo.isFocusedOption(app, "One")).toBe(true);

  await app.keyboard.press("enter");
  await settle(app);

  const changes = callsOf(app, "change");

  expect(changes).toHaveLength(1);
  expect(changes[0][0]).toBe("1");
  expect(combo.getListbox(app)).toBe(false);
  expect(combo.inputValue(app)).toBe("Two");
});

// kobalte/packages/core/src/combobox/combobox.test.tsx:2485
// Partial port (port sheet T-045): `defaultValue` "2" reads Two, opening
// highlights it, ArrowUp reaches One, Enter reports `"1"` and writes One.
test("T-045 supports default selection", async () => {
  const app = await openCase("default-two");

  expect(combo.inputValue(app)).toBe("Two");

  await combo.open(app);

  expect(combo.getOptions(app)).toBe(3);
  expect(combo.isFocusedOption(app, "Two")).toBe(true);

  await app.keyboard.press("arrowup");
  await app.clock!.runFor(20);

  expect(combo.isFocusedOption(app, "One")).toBe(true);

  await app.keyboard.press("enter");
  await settle(app);

  const changes = callsOf(app, "change");

  expect(changes).toHaveLength(1);
  expect(changes[0][0]).toBe("1");
  expect(combo.getListbox(app)).toBe(false);
  expect(combo.inputValue(app)).toBe("One");
});

// kobalte/packages/core/src/combobox/combobox.test.tsx:2566
// Partial port (port sheet T-046): the root's `disabledKeys` skip Two — two
// ArrowDowns land on Three, Enter reports `"3"`. `aria-disabled` and
// activeElement are dropped.
test("T-046 skips disabled items", async () => {
  const app = await openCase("disabled-keys");

  await combo.open(app);

  expect(combo.getOptions(app)).toBe(3);

  await app.keyboard.press("arrowdown");
  await app.keyboard.press("arrowdown");
  await app.clock!.runFor(20);

  expect(combo.isFocusedOption(app, "Three")).toBe(true);

  await app.keyboard.press("enter");
  await settle(app);

  const changes = callsOf(app, "change");

  expect(changes).toHaveLength(1);
  expect(changes[0][0]).toBe("3");
  expect(combo.getListbox(app)).toBe(false);
  expect(combo.inputValue(app)).toBe("Three");
});

// kobalte/packages/core/src/combobox/combobox.test.tsx:2659
// Partial port (port sheet T-047): opening focuses the already selected Two;
// Enter commits it. RAC's `commit()` takes the "already selected, single" branch
// and, with uncontrolled state, reports nothing — so no change callback, the text
// stays Two and the list closes. `disallowEmptySelection` is not a ComboBox prop:
// single selection is always non-empty upstream.
test("T-047 does not report a change when Enter commits the selected item", async () => {
  const app = await openCase("default-two");

  await combo.open(app);

  expect(combo.isFocusedOption(app, "Two")).toBe(true);
  expect(combo.isSelectedOption(app, "Two")).toBe(true);

  await app.keyboard.press("enter");
  await settle(app);

  expect(callsOf(app, "change")).toHaveLength(0);
  expect(combo.getListbox(app)).toBe(false);
  expect(combo.inputValue(app)).toBe("Two");
  expect(combo.endsOnInput(app)).toBe(true);
});

// kobalte/packages/core/src/combobox/combobox.test.tsx:2729
// Partial port (port sheet T-048): two presses report `["1"]` then `["1","3"]`,
// the list stays open, the typed text is cleared, and the Value reads
// `One and Three` (Intl.ListFormat conjunction, not a comma list).
test("T-048 supports selecting multiple options", async () => {
  const app = await openCase("multiple-log");

  await combo.open(app);

  expect(combo.getOptions(app)).toBe(3);

  await combo.toggleOptionSelection(app, "One");
  await app.clock!.runFor(20);

  expect(combo.getListbox(app)).toBe(true);

  await combo.toggleOptionSelection(app, "Three");
  await app.clock!.runFor(20);

  expect(callsOf(app, "change")).toEqual([[["1"]], [["1", "3"]]]);
  expect(combo.selectedOptions(app)).toBe(2);
  expect(combo.inputValue(app)).toBe("");
  expect(app.shows("text:One and Three")).toBe(true);
});

// kobalte/packages/core/src/combobox/combobox.test.tsx:2855
// Partial port (port sheet T-049): `defaultValue` shows both rows selected and
// reads `One and Two`; pressing Three reports all three keys.
test("T-049 supports multiple defaultValue", async () => {
  const app = await openCase("multiple-default");

  expect(app.shows("text:One and Two")).toBe(true);

  await combo.open(app);

  expect(combo.selectedOptions(app)).toBe(2);

  await combo.toggleOptionSelection(app, "Three");
  await app.clock!.runFor(20);

  expect(callsOf(app, "change")).toEqual([[["1", "2", "3"]]]);
  expect(combo.selectedOptions(app)).toBe(3);
});

// kobalte/packages/core/src/combobox/combobox.test.tsx:2950
// Partial port (port sheet T-050): the controlled `value` keeps two rows selected
// after pressing Three; the callback reports Three but no marker appears.
test("T-050 supports multiple controlled selection", async () => {
  const app = await openCase("multiple-controlled");

  expect(app.shows("text:One and Two")).toBe(true);

  await combo.open(app);

  expect(combo.selectedOptions(app)).toBe(2);

  await combo.toggleOptionSelection(app, "Three");
  await app.clock!.runFor(20);

  expect(callsOf(app, "change")).toEqual([[["1", "2", "3"]]]);
  expect(combo.isSelectedOption(app, "Three")).toBe(false);
  expect(combo.selectedOptions(app)).toBe(2);
});

// kobalte/packages/core/src/combobox/combobox.test.tsx:3035
// Partial port (port sheet T-051): pressing the already selected One removes its
// marker and reports only Two.
test("T-051 supports deselection", async () => {
  const app = await openCase("multiple-default");

  await combo.open(app);

  expect(combo.selectedOptions(app)).toBe(2);

  await combo.toggleOptionSelection(app, "One");
  await app.clock!.runFor(20);

  expect(combo.isSelectedOption(app, "One")).toBe(false);
  expect(callsOf(app, "change")).toEqual([[["2"]]]);
  expect(combo.selectedOptions(app)).toBe(1);
});

// kobalte/packages/core/src/combobox/combobox.test.tsx:3337
// Partial port (port sheet T-056): with the field disabled, the trigger never
// takes focus and Space does not open the list; `aria-expanded="false"` is
// dropped.
test("T-056 does not open on a Space press when disabled", async () => {
  const app = await openCase("disabled");

  await app.keyboard.press("tab");
  await app.keyboard.press("space");
  await settle(app);

  expect(combo.getListbox(app)).toBe(false);
  expect(callsOf(app, "openChange")).toHaveLength(0);
  // Upstream asserts only `document.activeElement !== trigger` (:3383); the
  // trigger's own focus probe stands for it. Tab may still land on the disabled
  // input on the reused web page, which is the host's behavior, not the field's.
  expect(callsOf(app, "triggerFocus")).toHaveLength(0);
});
