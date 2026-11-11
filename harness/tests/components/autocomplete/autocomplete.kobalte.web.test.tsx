import { expect, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";
import { openScenario } from "../../helpers/open-scenario";
import type { ScenarioOptions } from "../../helpers/open-scenario";
import * as autocomplete from "../../testers/autocomplete";

/*
 * Kobalte 0.13.14 combobox regressions for Autocomplete that need a browser
 * keyboard, per port sheet 4b (T-023 … T-025, T-030, T-034, T-035, T-039 …
 * T-046, T-055). They run on `--target web` only: NSH 0.4.0's Win32 host gives
 * keyboard focus only to an Input and does not deliver keymap keys to a view
 * (approved difference, port sheet section 8). Rows the port sheet lists as
 * `无头 windows` but that walk the list with arrows or Enter (T-043, T-044,
 * T-046, T-055) live here for the same reason.
 *
 * Kobalte drives a permanent combobox input; HeroUI's input lives in the
 * popover, so "ArrowDown opens the list" becomes "the press opens it and the
 * first option takes the virtual focus", and the arrow walk continues from
 * there. `aria-activedescendant` has no query: the focused row is the one the
 * scene marks with `*`.
 */

function openCase(name: string, options: ScenarioOptions = {}): Promise<App> {
  return openScenario(name, {
    platform: "web",
    clock: {},
    width: 1024,
    height: 768,
    ...options,
  });
}

/** Runs past the 100 ms exit hold. */
function settle(app: App): Promise<void> {
  return app.clock!.runFor(120);
}

/** The `open` boolean payloads the fixture recorded. */
function openChanges(app: App): unknown[] {
  return callsOf(app, "openChange").map((args) => args[0]);
}

// kobalte/packages/core/src/combobox/combobox.test.tsx:1052
// Rewritten (port sheet T-023): opening virtual-focuses the first option (the
// `disableAutoFocusFirst` default) and ArrowDown moves to the second.
test("T-023 opens and virtual focuses the first item", async () => {
  const app = await openCase("autocomplete/markers.split");

  expect(autocomplete.getListbox(app)).toBe(false);

  await autocomplete.open(app, "Select an animal");

  expect(autocomplete.getListbox(app)).toBe(true);
  expect(autocomplete.getOptions(app)).toBe(3);
  expect(app.shows("role:option[Cat]")).toBe(true);
  expect(app.shows("role:option[Dog]")).toBe(true);
  expect(app.shows("role:option[Panda]")).toBe(true);
  expect(autocomplete.isFocusedOption(app, "Cat")).toBe(true);

  await app.keyboard.press("arrowdown");

  expect(autocomplete.isFocusedOption(app, "Dog")).toBe(true);
});

// kobalte/packages/core/src/combobox/combobox.test.tsx:1113
// Rewritten (port sheet T-024): ArrowUp walks back to the last option.
test("T-024 virtual focuses the last item on ArrowUp", async () => {
  const app = await openCase("autocomplete/markers.split");

  expect(autocomplete.getListbox(app)).toBe(false);

  await autocomplete.open(app, "Select an animal");

  expect(autocomplete.getListbox(app)).toBe(true);
  expect(autocomplete.getOptions(app)).toBe(3);
  expect(app.shows("role:option[Cat]")).toBe(true);
  expect(app.shows("role:option[Dog]")).toBe(true);
  expect(app.shows("role:option[Panda]")).toBe(true);

  await app.keyboard.press("arrowup");

  expect(autocomplete.isFocusedOption(app, "Cat")).toBe(false);
  expect(autocomplete.isFocusedOption(app, "Panda")).toBe(true);
});

// kobalte/packages/core/src/combobox/combobox.test.tsx:1170
// Rewritten (port sheet T-025): the arrows walk the list and the input keeps the
// virtual focus (no option ever holds real focus, so the walk continues).
test("T-025 can change item focus with arrow keys", async () => {
  const app = await openCase("autocomplete/markers.split");

  await autocomplete.open(app, "Select an animal");

  expect(autocomplete.isFocusedOption(app, "Cat")).toBe(true);

  await app.keyboard.press("arrowdown");

  expect(autocomplete.isFocusedOption(app, "Dog")).toBe(true);

  await app.keyboard.press("arrowdown");

  expect(autocomplete.isFocusedOption(app, "Panda")).toBe(true);

  await app.keyboard.press("arrowup");

  expect(autocomplete.isFocusedOption(app, "Dog")).toBe(true);
  expect(autocomplete.isFocusedOption(app, "Panda")).toBe(false);
});

// kobalte/packages/core/src/combobox/combobox.test.tsx:1510
// Rewritten (port sheet T-030): Escape closes the list and reports the open
// change; the aria pair becomes the recorded callback.
test("T-030 can be closed by pressing the Escape key", async () => {
  const app = await openCase("autocomplete/default");

  expect(autocomplete.getListbox(app)).toBe(false);

  await autocomplete.open(app, "Select an animal");

  expect(autocomplete.getListbox(app)).toBe(true);

  const changes = callsOf(app, "openChange");

  expect(changes).toHaveLength(1);
  expect(changes[0][0]).toBe(true);

  await app.keyboard.press("escape");
  await settle(app);

  expect(autocomplete.getListbox(app)).toBe(false);
  expect(callsOf(app, "openChange")).toHaveLength(2);
  expect(callsOf(app, "openChange")[1][0]).toBe(false);
});

// kobalte/packages/core/src/combobox/combobox.test.tsx:1740
// Partial port (port sheet T-034): the `aria-labelledby` id wiring cannot be
// read; the field named through `aria-label` still opens its list.
test("T-034 supports labeling via aria-labelledby", async () => {
  const app = await openCase("autocomplete/aria-label");

  expect(app.shows("text:Select an animal")).toBe(true);

  await autocomplete.open(app, "Select an animal");

  expect(autocomplete.getListbox(app)).toBe(true);
});

// kobalte/packages/core/src/combobox/combobox.test.tsx:1787
// Partial port (port sheet T-035): `aria-label` and `aria-labelledby` both stay
// props of the public API; only the list they open is observable.
test("T-035 supports labeling via aria-label and aria-labelledby", async () => {
  const app = await openCase("autocomplete/aria-label");

  await autocomplete.open(app, "Select an animal");

  expect(autocomplete.getListbox(app)).toBe(true);
  expect(autocomplete.getOptions(app)).toBe(3);
});

// kobalte/packages/core/src/combobox/combobox.test.tsx:2007
// Rewritten (port sheet T-039): ArrowUp twice from the first option lands on Dog
// and Enter selects it; the trigger then shows it.
test("T-039 can select items with the Enter key", async () => {
  const app = await openCase("autocomplete/markers.split");

  await autocomplete.open(app, "Select an animal");

  expect(autocomplete.getOptions(app)).toBe(3);
  expect(app.shows("role:option[Cat]")).toBe(true);
  expect(app.shows("role:option[Dog]")).toBe(true);
  expect(app.shows("role:option[Panda]")).toBe(true);

  await app.keyboard.press("arrowup");

  expect(autocomplete.isFocusedOption(app, "Panda")).toBe(true);

  await app.keyboard.press("arrowup");

  expect(autocomplete.isFocusedOption(app, "Dog")).toBe(true);

  await app.keyboard.press("enter");
  await settle(app);

  const changes = callsOf(app, "change");

  expect(changes).toHaveLength(1);
  expect(changes[0][0]).toBe("dog");
  expect(autocomplete.getListbox(app)).toBe(false);
  expect(autocomplete.triggerShows(app, "Dog")).toBe(true);
});

// kobalte/packages/core/src/combobox/combobox.test.tsx:2080
// Rewritten (port sheet T-040): hovering an option moves the virtual focus to it,
// the next ArrowDown continues from there and Enter selects what the pointer
// left highlighted.
test("T-040 focuses items on hover", async () => {
  const app = await openCase("autocomplete/markers.split");

  await autocomplete.open(app, "Select an animal");

  expect(autocomplete.getOptions(app)).toBe(3);
  expect(app.shows("role:option[Cat]")).toBe(true);
  expect(app.shows("role:option[Dog]")).toBe(true);
  expect(app.shows("role:option[Panda]")).toBe(true);

  await app.hover("role:option[Dog]");

  expect(autocomplete.isFocusedOption(app, "Dog")).toBe(true);

  await app.keyboard.press("arrowdown");

  expect(autocomplete.isFocusedOption(app, "Panda")).toBe(true);

  await app.keyboard.press("enter");
  await settle(app);

  const changes = callsOf(app, "change");

  expect(changes).toHaveLength(1);
  expect(changes[0][0]).toBe("panda");
  expect(autocomplete.getListbox(app)).toBe(false);
  expect(autocomplete.triggerShows(app, "Panda")).toBe(true);
});

// kobalte/packages/core/src/combobox/combobox.test.tsx:2177
// Ported (port sheet T-041): Escape only closes the list; the selection stays
// reported once and keeps its label.
test("T-041 does not clear selection on escape closing the listbox", async () => {
  const app = await openCase("autocomplete/markers-selected.split");

  await autocomplete.open(app, "Dog");

  await autocomplete.toggleOptionSelection(app, "Panda");
  await settle(app);

  expect(callsOf(app, "change")).toHaveLength(1);
  expect(autocomplete.getListbox(app)).toBe(false);

  await autocomplete.open(app, "Panda");

  expect(autocomplete.getListbox(app)).toBe(true);

  await app.keyboard.press("escape");
  await settle(app);

  expect(callsOf(app, "change")).toHaveLength(1);
  expect(autocomplete.getListbox(app)).toBe(false);
  expect(autocomplete.triggerShows(app, "Panda")).toBe(true);
});

// kobalte/packages/core/src/combobox/combobox.test.tsx:2286
// Partial port (port sheet T-042): Kobalte clears a single selection when Escape
// arrives with the list closed; HeroUI's Select authority keeps the value, so
// the applicable half is kept — the second Escape reports no selection change
// and the label stays.
test("T-042 keeps the selection on escape when the listbox is not visible", async () => {
  const app = await openCase("autocomplete/markers-selected.split");

  await autocomplete.open(app, "Dog");

  await autocomplete.toggleOptionSelection(app, "Panda");
  await settle(app);

  expect(callsOf(app, "change")).toHaveLength(1);

  await app.keyboard.press("escape");
  await settle(app);

  expect(callsOf(app, "change")).toHaveLength(1);
  expect(autocomplete.triggerShows(app, "Panda")).toBe(true);
});

// kobalte/packages/core/src/combobox/combobox.test.tsx:2566
// Rewritten (port sheet T-045): the arrow walk skips a disabled row, the press
// on that row is refused, and Enter selects the row the walk reached.
test("T-045 skips disabled items", async () => {
  const app = await openCase("autocomplete/markers-disabled.split");

  await autocomplete.open(app, "Select an animal");

  expect(autocomplete.getOptions(app)).toBe(3);
  expect(app.shows("role:option[Cat]")).toBe(true);
  expect(app.shows("role:option[Dog]")).toBe(true);
  expect(app.shows("role:option[Panda]")).toBe(true);
  expect(app.enabled("role:option[Dog]")).toBe(false);

  await expect(app.press("role:option[Dog]")).rejects.toMatchObject({
    code: "ERR_NSH_TEST_DISABLED",
  });

  await app.keyboard.press("arrowdown");
  await app.keyboard.press("arrowdown");

  expect(autocomplete.isFocusedOption(app, "Panda")).toBe(true);

  await app.keyboard.press("enter");
  await settle(app);

  const changes = callsOf(app, "change");

  expect(changes).toHaveLength(1);
  expect(changes[0][0]).toBe("panda");
  expect(autocomplete.getListbox(app)).toBe(false);
  expect(autocomplete.triggerShows(app, "Panda")).toBe(true);
});

// kobalte/packages/core/src/combobox/combobox.test.tsx:2403
// Ported (port sheet T-043): a controlled `value` shows Dog, focuses it when the
// list opens, and ignores the selection the arrow key and Enter report.
test("T-043 supports controlled selection", async () => {
  const app = await openCase("autocomplete/markers-controlled.split");

  expect(autocomplete.triggerShows(app, "Dog")).toBe(true);

  await autocomplete.open(app, "Dog");

  expect(autocomplete.getOptions(app)).toBe(3);
  expect(autocomplete.isFocusedOption(app, "Dog")).toBe(true);
  expect(app.shows("role:option[Dog] >> text:✓")).toBe(true);

  await app.keyboard.press("arrowup");

  expect(autocomplete.isFocusedOption(app, "Cat")).toBe(true);

  await app.keyboard.press("enter");
  await settle(app);

  const changes = callsOf(app, "change");

  expect(changes).toHaveLength(1);
  expect(changes[0][0]).toBe("cat");
  expect(autocomplete.getListbox(app)).toBe(false);
  expect(autocomplete.triggerShows(app, "Dog")).toBe(true);
});

// kobalte/packages/core/src/combobox/combobox.test.tsx:2485
// Ported (port sheet T-044): the default selection shows Dog, focuses it on open
// and is replaced by the keyboard walk.
test("T-044 supports default selection", async () => {
  const app = await openCase("autocomplete/markers-selected.split");

  expect(autocomplete.triggerShows(app, "Dog")).toBe(true);

  await autocomplete.open(app, "Dog");

  expect(autocomplete.getOptions(app)).toBe(3);
  expect(autocomplete.isFocusedOption(app, "Dog")).toBe(true);
  expect(app.shows("role:option[Dog] >> text:✓")).toBe(true);

  await app.keyboard.press("arrowup");

  expect(autocomplete.isFocusedOption(app, "Cat")).toBe(true);

  await app.keyboard.press("enter");
  await settle(app);

  const changes = callsOf(app, "change");

  expect(changes).toHaveLength(1);
  expect(changes[0][0]).toBe("cat");
  expect(autocomplete.getListbox(app)).toBe(false);
  expect(autocomplete.triggerShows(app, "Cat")).toBe(true);
});

// kobalte/packages/core/src/combobox/combobox.test.tsx:2659
// Rewritten (port sheet T-046): pressing the already-selected item reports that
// same key instead of an empty selection (HeroUI's single-select policy keeps a
// selection; `disallowEmptySelection` is the list's default).
test("T-046 does not deselect when pressing an already selected item", async () => {
  const app = await openCase("autocomplete/markers-selected.split");

  await autocomplete.open(app, "Dog");

  expect(autocomplete.isFocusedOption(app, "Dog")).toBe(true);

  await app.keyboard.press("enter");
  await settle(app);

  const changes = callsOf(app, "change");

  expect(changes).toHaveLength(1);
  expect(changes[0][0]).toBe("dog");
  expect(autocomplete.getListbox(app)).toBe(false);
  expect(autocomplete.triggerShows(app, "Dog")).toBe(true);
});

// kobalte/packages/core/src/combobox/combobox.test.tsx:3337
// Rewritten (port sheet T-055): Space cannot activate a disabled field. The
// trigger's own focus is a Windows host gap (never focusable) and the assertion
// that it is not focused has no query; what stays is that nothing opens.
test("T-055 does not open on Space key press when disabled is true", async () => {
  const app = await openCase("autocomplete/disabled");

  expect(autocomplete.getListbox(app)).toBe(false);

  await app.keyboard.press("space");
  await settle(app);

  expect(autocomplete.getListbox(app)).toBe(false);
  expect(openChanges(app)).toHaveLength(0);
});

