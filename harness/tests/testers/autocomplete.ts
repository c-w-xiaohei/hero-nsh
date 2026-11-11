import type { App } from "nsh/test";

/*
 * The Autocomplete tester (port sheet 4b, replacing React Aria's `Select`
 * tester, which upstream's unit cases drive). It only names selectors and
 * steps; every assertion stays in the test.
 *
 * Markers, following the port sheet's contract:
 *   - the `markers*` scenes suffix the row that holds the list's virtual focus
 *     with `*` and keep each row's accessible name on `aria-label`, so
 *     `role:option[Dog] >> text:/[*]$/` identifies the highlighted row without
 *     an `aria-activedescendant` query (NSH has no DOM attribute channel);
 *   - `ListBox.ItemIndicator` renders `✓` for a selected row, so
 *     `role:option >> text:✓` counts the selection.
 *
 * The trigger has no role of its own in HeroUI (it is a Group holding the
 * Value and the Indicator), so a test reaches it through the text it shows:
 * the placeholder while nothing is selected, the value afterwards.
 */

/** The listbox role the open Autocomplete shows. */
export const LISTBOX = "role:listbox";

/** The option the accessible name picks out. */
export function option(name: string): string {
  return `role:option[${name}]`;
}

/** Whether the listbox is on screen (the port sheet's `getListbox`). */
export function getListbox(app: App): boolean {
  return app.shows(LISTBOX);
}

/** How many options the open list shows (the port sheet's `getOptions`). */
export function getOptions(app: App): number {
  return app.count("role:option");
}

/** Presses the trigger — the text it shows — and waits for the listbox. */
export async function open(app: App, triggerText: string): Promise<void> {
  await app.press(`text:${triggerText}`);
  await app.waitFor(LISTBOX);
}

/**
 * Presses the trigger by test id and waits for the listbox: a trigger that
 * shows tags instead of its placeholder (a multiple selection with values)
 * has no placeholder text to press.
 */
export async function openTrigger(app: App): Promise<void> {
  await app.press("id:autocomplete-trigger");
  await app.waitFor(LISTBOX);
}

/** Presses the option the accessible name picks out and waits for the press. */
export function toggleOptionSelection(app: App, name: string): Promise<void> {
  return app.press(option(name));
}

/** Whether the row `name` carries the focus marker. */
export function isFocusedOption(app: App, name: string): boolean {
  return app.shows(`${option(name)} >> text:/[*]$/`);
}

/** How many rows show the selected marker. */
export function selectedOptions(app: App): number {
  return app.count("role:option >> text:✓");
}

/** Whether the trigger reads `text`. */
export function triggerShows(app: App, text: string): boolean {
  return app.shows(`text:${text}`);
}

/** The texts of the open options, in order. */
export function optionTexts(app: App): string[] {
  return app
    .texts()
    .filter((text) => /^(Cat|Dog|Panda|Apple|Banana|Blueberry|Grapes|Pineapple|Animal \d+)/.test(text));
}
