import type { App } from "nsh/test";
import { calls } from "../helpers/calls";

/*
 * The ComboBox tester for the ported cases (port sheet 4b, replacing React
 * Aria's `ComboBox` tester). It only names selectors and steps; every assertion
 * stays in the test.
 *
 * `harness/combo-box.fixtures.tsx` gives the trigger `testID="combo-box-trigger"`,
 * the input `testID="combo-box-input"`; the highlighted row carries a `*` suffix
 * on its label and a selected row renders `✓` from `ListBox.ItemIndicator`, per
 * the port sheet's tester contract.
 */

/** The combobox role the field's input carries. */
export const COMBO_BOX = "role:combobox";

/** The trigger inside a fixture case. */
export const COMBO_BOX_TRIGGER = "id:combo-box-trigger";

/** The listbox role the open ComboBox shows. */
export const COMBO_BOX_LISTBOX = "role:listbox";

/** The input's selector (the port sheet's `getCombobox`). */
export function getCombobox(app: App): string {
  void app;

  return COMBO_BOX;
}

/** Whether the listbox is on screen (the port sheet's `getListbox`). */
export function getListbox(app: App): boolean {
  return app.shows(COMBO_BOX_LISTBOX);
}

/** How many options the open list shows (the port sheet's `getOptions`). */
export function getOptions(app: App): number {
  return app.count("role:option");
}

/**
 * Presses the trigger and waits for the listbox. Upstream's tester takes a
 * `triggerBehavior`; pressing the trigger is the step that works for every
 * `menuTrigger` mode.
 */
export async function open(app: App): Promise<void> {
  await app.press(COMBO_BOX_TRIGGER);
  await app.waitFor(COMBO_BOX_LISTBOX);
}

/** Presses the option the accessible name picks out. */
export function toggleOptionSelection(app: App, name: string): Promise<void> {
  return app.press(`role:option[${name}]`);
}

/** The input's text (upstream `toHaveValue`). */
export function inputValue(app: App): string | null {
  return app.value(COMBO_BOX);
}

/** Whether the row `name` carries the focus marker. */
export function isFocusedOption(app: App, name: string): boolean {
  return app.shows(`role:option[${name}] >> text:${name}*`);
}

/** How many rows carry the focus marker. */
export function focusedOptions(app: App): number {
  return app.count("role:listbox >> text:/\\*$/");
}

/** How many rows show the selected marker. */
export function selectedOptions(app: App): number {
  return app.count("role:listbox >> text:✓");
}

/** Whether the row `name` shows the selected marker. */
export function isSelectedOption(app: App, name: string): boolean {
  return app.shows(`role:option[${name}] >> text:✓`);
}

/** Focus / blur probes recorded by the fixture, in order. */
export function focusEvents(app: App): string[] {
  return calls(app)
    .filter((call) => call.name.endsWith("Focus") || call.name.endsWith("Blur"))
    .map((call) => call.name);
}

/** The last focus event the fixture recorded (`toHaveFocus` has no query). */
export function endsOn(app: App, name: string): boolean {
  const events = focusEvents(app);

  return events.length > 0 && events[events.length - 1] === name;
}

/** Whether focus ended on the field's input. */
export function endsOnInput(app: App): boolean {
  return endsOn(app, "inputFocus");
}
