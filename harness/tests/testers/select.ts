import type { App } from "nsh/test";
import { calls } from "../helpers/calls";

/*
 * The Select tester for the ported cases (port sheet 4b, replacing React
 * Aria's `Select` tester). It only names selectors and steps; every assertion
 * stays in the test.
 *
 * `harness/select.fixtures.tsx` gives the trigger `testID="select-trigger"` and
 * the ClearButton `testID="select-clear-button"`; the highlighted row carries a
 * `*` suffix on its label and a selected row renders `✓` from
 * `ListBox.ItemIndicator`, per the port sheet's tester contract.
 */

/** The trigger inside a fixture case. */
export const SELECT_TRIGGER = "id:select-trigger";

/** The ClearButton inside a fixture case. */
export const SELECT_CLEAR_BUTTON = "id:select-clear-button";

/** The listbox role the open Select shows. */
export const SELECT_LISTBOX = "role:listbox";

/** Every focus marker inside the list: one per highlighted row. */
export const FOCUS_MARKERS = "role:listbox >> text:/\\*$/";

/** The trigger's selector (the port sheet's `getTrigger`). */
export function getTrigger(app: App): string {
  void app;

  return SELECT_TRIGGER;
}

/** The ClearButton's selector (the port sheet's `getClearButton`). */
export function getClearButton(app: App): string {
  void app;

  return SELECT_CLEAR_BUTTON;
}

/** Whether the listbox is on screen (the port sheet's `getListbox`). */
export function getListbox(app: App): boolean {
  return app.shows(SELECT_LISTBOX);
}

/** How many options the open list shows (the port sheet's `getOptions`). */
export function getOptions(app: App): number {
  return app.count("role:option");
}

/** Presses the trigger and waits for the listbox. */
export async function open(app: App): Promise<void> {
  await app.press(SELECT_TRIGGER);
  await app.waitFor(SELECT_LISTBOX);
}

/** Presses the option the accessible name picks out. */
export function toggleOptionSelection(app: App, name: string): Promise<void> {
  return app.press(`role:option[${name}]`);
}

/** Whether the row `name` carries the focus marker. */
export function isFocusedOption(app: App, name: string): boolean {
  return app.shows(`role:option[${name}] >> text:${name}*`);
}

/** How many rows show the selected marker. */
export function selectedOptions(app: App): number {
  return app.count("role:listbox >> text:✓");
}

/**
 * Whether the trigger's value reads `text`. The fixture's row label carries a
 * `*` while the row holds the list's focus, and the Value renders the selected
 * row's children again, so the marker may be present while the list is open.
 */
export function triggerShows(app: App, text: string): boolean {
  return app.shows(`${SELECT_TRIGGER} >> text:/^${text}\\*?$/`);
}

/**
 * Whether focus ended on the trigger. Upstream asserts
 * `document.activeElement === trigger`; NSH reads the trigger's own
 * onFocus / onBlur probes, so the meaningful fact is that the last focus event
 * the trigger reported is a focus.
 */
export function endsOnTrigger(app: App): boolean {
  const events = calls(app).filter(
    (call) => call.name === "triggerFocus" || call.name === "triggerBlur",
  );

  return events.length > 0 && events[events.length - 1].name === "triggerFocus";
}

