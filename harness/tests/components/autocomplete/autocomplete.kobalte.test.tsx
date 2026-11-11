import { expect, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";
import { openScenario } from "../../helpers/open-scenario";
import type { ScenarioOptions } from "../../helpers/open-scenario";
import * as autocomplete from "../../testers/autocomplete";

/*
 * Kobalte 0.13.14 combobox regressions for Autocomplete, per port sheet 4b
 * (T-012, T-017 … T-019, T-021, T-022, T-026 … T-029, T-031 … T-033, T-036 …
 * T-038, T-043, T-044, T-046 … T-050, T-054, T-055, T-058).
 *
 * Upstream skips its whole `Combobox` block in jsdom (a pointer-event stub), but
 * the cases are still the interaction contract, so they are translated.
 *
 * Kobalte's collection API (`options` / `optionValue` / `itemComponent`, the
 * hidden select, the DOM focus bridge) does not exist in HeroUI; rows that test
 * it are deleted in the port sheet and rows that only need its behavior are
 * rewritten onto HeroUI's Item children. Every comment says what was swapped.
 *
 * Cases marked "无头 web" open with `platform: "web"` because Kobalte's pointer
 * idiom there is the browser's; the rest run on the Windows platform, which is
 * this project's default headless target.
 */

function openCase(name: string, options: ScenarioOptions = {}): Promise<App> {
  return openScenario(name, { clock: {}, width: 1024, height: 768, ...options });
}

function openWebCase(name: string, options: ScenarioOptions = {}): Promise<App> {
  return openCase(name, { platform: "web", ...options });
}

/** Runs past the 100 ms exit hold. */
function settle(app: App): Promise<void> {
  return app.clock!.runFor(120);
}

/** The `open` boolean payloads the fixture recorded. */
function openChanges(app: App): unknown[] {
  return callsOf(app, "openChange").map((args) => args[0]);
}

// kobalte/packages/core/src/combobox/combobox.test.tsx:47
// Partial port (port sheet T-012): the group root, the combobox input's
// aria attributes and the trigger's tabindex have no query. What the case proves
// visibly stays: the label, the placeholder trigger and the three options the
// list shows.
test("T-012 renders correctly", async () => {
  const app = await openWebCase("autocomplete/default");

  expect(app.shows("text:Favorite Animal")).toBe(true);
  expect(app.shows("text:Select an animal")).toBe(true);

  await autocomplete.open(app, "Select an animal");

  expect(app.shows("label:Search animals")).toBe(true);
  expect(autocomplete.getOptions(app)).toBe(3);
  expect(app.shows("role:option[Cat]")).toBe(true);
  expect(app.shows("role:option[Dog]")).toBe(true);
  expect(app.shows("role:option[Panda]")).toBe(true);
});

// kobalte/packages/core/src/combobox/combobox.test.tsx:523
// Partial port (port sheet T-017): Kobalte's unmapped `options` array becomes
// Item children; the row's text and the press result are kept. `data-key` /
// `data-disabled` attributes and the input-value/focus assertions have no
// channel; the trigger's value is the visible equivalent.
test("T-017 supports string options without mapping", async () => {
  const app = await openWebCase("autocomplete/default");

  await autocomplete.open(app, "Select an animal");

  expect(autocomplete.getOptions(app)).toBe(3);
  expect(app.shows("role:option[Cat]")).toBe(true);
  expect(app.shows("role:option[Dog]")).toBe(true);
  expect(app.shows("role:option[Panda]")).toBe(true);

  await autocomplete.toggleOptionSelection(app, "Panda");
  await settle(app);

  const changes = callsOf(app, "change");

  expect(changes).toHaveLength(1);
  expect(changes[0][0]).toBe("panda");
  expect(autocomplete.getListbox(app)).toBe(false);
  expect(autocomplete.triggerShows(app, "Panda")).toBe(true);
});

// kobalte/packages/core/src/combobox/combobox.test.tsx:614
// Partial port (port sheet T-018): the option mapper is deleted (Kobalte-only);
// the selection it produces is kept. Pressing the second row reports its key.
test("T-018 supports function based option mapping for string options", async () => {
  const app = await openWebCase("autocomplete/default");

  await autocomplete.open(app, "Select an animal");

  expect(autocomplete.getOptions(app)).toBe(3);
  expect(app.shows("role:option[Cat]")).toBe(true);
  expect(app.shows("role:option[Dog]")).toBe(true);
  expect(app.shows("role:option[Panda]")).toBe(true);

  await autocomplete.toggleOptionSelection(app, "Dog");
  await settle(app);

  const changes = callsOf(app, "change");

  expect(changes).toHaveLength(1);
  expect(changes[0][0]).toBe("dog");
  expect(autocomplete.getListbox(app)).toBe(false);
  expect(autocomplete.triggerShows(app, "Dog")).toBe(true);
});

// kobalte/packages/core/src/combobox/combobox.test.tsx:709
// Partial port (port sheet T-019): numeric options keep their number display and
// their key when selected; Kobalte's data representation is deleted.
test("T-019 supports number options without mapping", async () => {
  const app = await openWebCase("autocomplete/numbers");

  await autocomplete.open(app, "Select a number");

  expect(autocomplete.getOptions(app)).toBe(3);
  expect(app.shows("role:option[1]")).toBe(true);
  expect(app.shows("role:option[2]")).toBe(true);
  expect(app.shows("role:option[3]")).toBe(true);

  await autocomplete.toggleOptionSelection(app, "2");
  await settle(app);

  const changes = callsOf(app, "change");

  expect(changes).toHaveLength(1);
  expect(changes[0][0]).toBe("2");
  expect(autocomplete.getListbox(app)).toBe(false);
  expect(autocomplete.triggerShows(app, "2")).toBe(true);
});

// kobalte/packages/core/src/combobox/combobox.test.tsx:897
// Rewritten (port sheet T-021): a pointer press on the trigger opens the list —
// `pointerdown` / `pointerup` / `click` are one `app.press`. The
// `aria-expanded` / `aria-controls` pair and the input's focus become the
// open-state report the fixture records.
test("T-021 can be opened on mouse down", async () => {
  const app = await openCase("autocomplete/default");

  expect(autocomplete.getListbox(app)).toBe(false);
  expect(openChanges(app)).toHaveLength(0);

  await autocomplete.open(app, "Select an animal");

  expect(autocomplete.getListbox(app)).toBe(true);
  expect(openChanges(app)).toEqual([true]);
  expect(autocomplete.getOptions(app)).toBe(3);
  expect(app.shows("role:option[Cat]")).toBe(true);
  expect(app.shows("role:option[Dog]")).toBe(true);
  expect(app.shows("role:option[Panda]")).toBe(true);
});

// kobalte/packages/core/src/combobox/combobox.test.tsx:971
// Partial port (port sheet T-022): `PressEvent` carries no pointer type and a
// touch is a pointer press in NSH, so the `pointerType: "touch"` half is gone;
// the open behavior it asserts is kept on the web platform.
test("T-022 can be opened on touch up", async () => {
  const app = await openWebCase("autocomplete/markers.split");

  expect(autocomplete.getListbox(app)).toBe(false);

  await autocomplete.open(app, "Select an animal");

  expect(autocomplete.getListbox(app)).toBe(true);
  expect(openChanges(app)).toEqual([true]);
  expect(autocomplete.getOptions(app)).toBe(3);
  expect(autocomplete.isFocusedOption(app, "Cat")).toBe(true);
});

// kobalte/packages/core/src/combobox/combobox.test.tsx:1245
// Ported (port sheet T-026): a held `isOpen` shows the list and is not written
// back; the aria pair becomes the recorded callback count.
test("T-026 supports controlled open state", async () => {
  const app = await openCase("autocomplete/controlled-open");

  await app.waitFor(autocomplete.LISTBOX);

  expect(autocomplete.getListbox(app)).toBe(true);
  expect(openChanges(app)).toHaveLength(0);
  expect(autocomplete.getOptions(app)).toBe(3);
  expect(app.shows("role:option[Cat]")).toBe(true);
  expect(app.shows("role:option[Dog]")).toBe(true);
  expect(app.shows("role:option[Panda]")).toBe(true);
});

// kobalte/packages/core/src/combobox/combobox.test.tsx:1297
// Ported (port sheet T-027): `defaultOpen` shows the list without reporting an
// open change.
test("T-027 supports default open state", async () => {
  const app = await openCase("autocomplete/open");

  await app.waitFor(autocomplete.LISTBOX);

  expect(autocomplete.getListbox(app)).toBe(true);
  expect(openChanges(app)).toHaveLength(0);
  expect(autocomplete.getOptions(app)).toBe(3);
  expect(app.shows("role:option[Cat]")).toBe(true);
  expect(app.shows("role:option[Dog]")).toBe(true);
  expect(app.shows("role:option[Panda]")).toBe(true);
});

// kobalte/packages/core/src/combobox/combobox.test.tsx:1351
// Rewritten (port sheet T-028): the trigger toggles the list closed.
test("T-028 can be closed by clicking on the button", async () => {
  const app = await openCase("autocomplete/default");

  await autocomplete.open(app, "Select an animal");

  expect(autocomplete.getListbox(app)).toBe(true);
  expect(openChanges(app)).toEqual([true]);

  await app.press("text:Select an animal");
  await settle(app);

  expect(autocomplete.getListbox(app)).toBe(false);
  expect(openChanges(app)).toEqual([true, false]);
});

// kobalte/packages/core/src/combobox/combobox.test.tsx:1423
// Rewritten (port sheet T-029): a press on a view outside the popover closes it
// through `onPressOutside`.
test("T-029 can be closed by clicking outside", async () => {
  const app = await openCase("autocomplete/outside");

  await autocomplete.open(app, "Select an animal");

  expect(autocomplete.getListbox(app)).toBe(true);
  expect(openChanges(app)).toEqual([true]);

  await app.press("role:button[Outside]");
  await settle(app);

  expect(autocomplete.getListbox(app)).toBe(false);
  expect(openChanges(app)).toEqual([true, false]);
});

// kobalte/packages/core/src/combobox/combobox.test.tsx:1577
// Ported (port sheet T-031): a held `isOpen` ignores Escape: the list stays and
// the callback reports `false` without a write-back.
test("T-031 does not close in controlled open state", async () => {
  const app = await openCase("autocomplete/controlled-open");

  await app.waitFor(autocomplete.LISTBOX);

  expect(openChanges(app)).toHaveLength(0);

  await app.keyboard.press("escape");
  await settle(app);

  expect(autocomplete.getListbox(app)).toBe(true);
  expect(openChanges(app)).toEqual([false]);
});

// kobalte/packages/core/src/combobox/combobox.test.tsx:1628
// Ported (port sheet T-032): `defaultOpen` closes on Escape.
test("T-032 closes in default open state", async () => {
  const app = await openCase("autocomplete/open");

  await app.waitFor(autocomplete.LISTBOX);

  expect(openChanges(app)).toHaveLength(0);

  await app.keyboard.press("escape");
  await settle(app);

  expect(autocomplete.getListbox(app)).toBe(false);
  expect(openChanges(app)).toEqual([false]);
});

// kobalte/packages/core/src/combobox/combobox.test.tsx:1683
// Partial port (port sheet T-033): the `aria-labelledby` wiring between label,
// input and listbox has no query. The visible label and the list it names stay.
test("T-033 supports labeling with a visible label", async () => {
  const app = await openCase("autocomplete/default");

  expect(app.shows("text:Favorite Animal")).toBe(true);

  await autocomplete.open(app, "Select an animal");

  expect(autocomplete.getListbox(app)).toBe(true);
  expect(autocomplete.getOptions(app)).toBe(3);
  expect(app.shows("role:option[Dog]")).toBe(true);
});

// kobalte/packages/core/src/combobox/combobox.test.tsx:1836
// Partial port (port sheet T-036): the description is visible; the input's
// `aria-describedby` has no channel.
test("T-036 supports description", async () => {
  const app = await openCase("autocomplete/description");

  expect(app.shows("text:Pick the animal you like best")).toBe(true);
  expect(app.shows("text:Favorite Animal")).toBe(true);
});

// kobalte/packages/core/src/combobox/combobox.test.tsx:1873
// Partial port (port sheet T-037): `validationState="invalid"` becomes
// `isInvalid`, and the message stays; the `aria-describedby` link has no channel.
test("T-037 supports error message", async () => {
  const app = await openCase("autocomplete/invalid");

  expect(app.shows("text:Please choose an animal")).toBe(true);
  expect(app.shows("text:Favorite Animal")).toBe(true);
});

// kobalte/packages/core/src/combobox/combobox.test.tsx:1913
// Rewritten (port sheet T-038): a pointer press on an option selects it, reports
// its key, closes the list and puts the label in the trigger.
test("T-038 can select items on press", async () => {
  const app = await openCase("autocomplete/default");

  await autocomplete.open(app, "Select an animal");

  expect(autocomplete.getOptions(app)).toBe(3);
  expect(app.shows("role:option[Cat]")).toBe(true);
  expect(app.shows("role:option[Dog]")).toBe(true);
  expect(app.shows("role:option[Panda]")).toBe(true);

  await autocomplete.toggleOptionSelection(app, "Panda");
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

// kobalte/packages/core/src/combobox/combobox.test.tsx:2729
// Ported (port sheet T-047): a multiple list reports an array per press, keeps
// the list open and shows the selected animals as tags.
test("T-047 supports selecting multiple options", async () => {
  const app = await openCase("autocomplete/multiple");

  await autocomplete.open(app, "Select animals");

  expect(autocomplete.getOptions(app)).toBe(3);
  expect(app.shows("role:option[Cat]")).toBe(true);
  expect(app.shows("role:option[Dog]")).toBe(true);
  expect(app.shows("role:option[Panda]")).toBe(true);

  await autocomplete.toggleOptionSelection(app, "Cat");
  await autocomplete.toggleOptionSelection(app, "Panda");

  const changes = callsOf(app, "change");

  expect(changes).toHaveLength(2);
  expect(changes[0][0]).toEqual(["cat"]);
  expect(changes[1][0]).toEqual(["cat", "panda"]);
  expect(app.shows("role:option[Cat] >> text:✓")).toBe(true);
  expect(app.shows("role:option[Panda] >> text:✓")).toBe(true);

  // Multiple selection does not close the list.
  expect(autocomplete.getListbox(app)).toBe(true);
  expect(app.shows("role:row[Cat]")).toBe(true);
  expect(app.shows("role:row[Panda]")).toBe(true);
});

// kobalte/packages/core/src/combobox/combobox.test.tsx:2855
// Ported (port sheet T-048): the two default tags stay selected and a press adds
// a third one to the reported array.
test("T-048 supports multiple defaultValue", async () => {
  const app = await openCase("autocomplete/multiple-default");

  await autocomplete.open(app, "Select animals");

  expect(app.shows("role:option[Cat] >> text:✓")).toBe(true);
  expect(app.shows("role:option[Dog] >> text:✓")).toBe(true);

  await autocomplete.toggleOptionSelection(app, "Panda");

  const changes = callsOf(app, "change");

  expect(changes).toHaveLength(1);
  expect(changes[0][0]).toEqual(["cat", "dog", "panda"]);
  expect(app.shows("role:option[Cat] >> text:✓")).toBe(true);
  expect(app.shows("role:option[Dog] >> text:✓")).toBe(true);
  expect(app.shows("role:option[Panda] >> text:✓")).toBe(true);
});

// kobalte/packages/core/src/combobox/combobox.test.tsx:2950
// Ported (port sheet T-049): a held multiple `value` reports the press but stays
// at the two selected rows, so the new row is not marked selected.
test("T-049 supports multiple value (controlled)", async () => {
  const app = await openCase("autocomplete/multiple-controlled");

  await autocomplete.open(app, "Select animals");

  expect(app.shows("role:option[Cat] >> text:✓")).toBe(true);
  expect(app.shows("role:option[Dog] >> text:✓")).toBe(true);

  await autocomplete.toggleOptionSelection(app, "Panda");

  const changes = callsOf(app, "change");

  expect(changes).toHaveLength(1);
  expect(changes[0][0]).toEqual(["cat", "dog", "panda"]);
  expect(app.shows("role:option[Panda] >> text:✓")).toBe(false);
});

// kobalte/packages/core/src/combobox/combobox.test.tsx:3035
// Ported (port sheet T-050): pressing a selected row of a multiple list drops it
// from the reported array and clears its marker.
test("T-050 supports deselection", async () => {
  const app = await openCase("autocomplete/multiple-default");

  await autocomplete.open(app, "Select animals");

  expect(app.shows("role:option[Cat] >> text:✓")).toBe(true);
  expect(app.shows("role:option[Dog] >> text:✓")).toBe(true);

  await autocomplete.toggleOptionSelection(app, "Cat");

  const changes = callsOf(app, "change");

  expect(changes).toHaveLength(1);
  expect(changes[0][0]).toEqual(["dog"]);
  expect(app.shows("role:option[Cat] >> text:✓")).toBe(false);
  expect(app.shows("role:option[Dog] >> text:✓")).toBe(true);
});

// kobalte/packages/core/src/combobox/combobox.test.tsx:3285
// Ported (port sheet T-054): a disabled field refuses the press, keeps the list
// closed and reports no open change.
test("T-054 does not open on mouse down when disabled is true", async () => {
  const app = await openCase("autocomplete/disabled");

  expect(autocomplete.getListbox(app)).toBe(false);

  await expect(app.press("text:Select an animal")).rejects.toMatchObject({
    code: "ERR_NSH_TEST_DISABLED",
  });
  await settle(app);

  expect(autocomplete.getListbox(app)).toBe(false);
  expect(openChanges(app)).toHaveLength(0);
});

// kobalte/packages/core/src/combobox/combobox.test.tsx:3337
// Rewritten (port sheet T-055): Space cannot activate a disabled field. The
// trigger's own focus is a Windows host gap (never focusable) and the assertion
// that it is not focused has no query; what stays is that nothing opens.
test("T-055 does not open on Space key press when disabled is true", async () => {
  const app = await openWebCase("autocomplete/disabled");

  expect(autocomplete.getListbox(app)).toBe(false);

  await app.keyboard.press("space");
  await settle(app);

  expect(autocomplete.getListbox(app)).toBe(false);
  expect(openChanges(app)).toHaveLength(0);
});

// kobalte/packages/core/src/combobox/combobox.test.tsx:3503
// Rewritten (port sheet T-058): typing into the filter narrows the collection and
// the press lands on the filtered row. The fixture's `filter` is HeroUI's
// equivalent of `defaultFilter="contains"`.
test("T-058 selects the clicked option after filtering with a mouse", async () => {
  const app = await openCase("autocomplete/filter");

  await autocomplete.open(app, "Select a fruit");

  expect(autocomplete.getOptions(app)).toBe(5);

  await app.type("label:Search fruits", "ap");

  expect(autocomplete.getOptions(app)).toBe(3);
  expect(app.shows("role:option[Apple]")).toBe(true);
  expect(app.shows("role:option[Grapes]")).toBe(true);
  expect(app.shows("role:option[Pineapple]")).toBe(true);

  await autocomplete.toggleOptionSelection(app, "Grapes");
  await settle(app);

  const changes = callsOf(app, "change");

  expect(changes).toHaveLength(1);
  expect(changes[0][0]).toBe("Grapes");
  expect(autocomplete.triggerShows(app, "Grapes")).toBe(true);
});
