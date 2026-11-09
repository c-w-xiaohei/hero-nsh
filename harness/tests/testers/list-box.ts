import type { App } from "nsh/test";

/*
 * The ListBox tester for the ported cases (port sheet 4b, replacing React
 * Aria's `ListBox` tester).
 *
 * `selectedOptions` counts the shared `✓` marker the fixtures render from
 * `ListBox.ItemIndicator`'s render prop; HeroUI's built-in checkmark has no
 * text, so the unit's fixtures use a text mark (see scenarios/list-box.scenarios.tsx
 * and harness/list-box.fixtures.tsx).
 */

/** How many options the list shows. */
export function options(app: App): number {
  return app.count("role:option");
}

/** Presses the option the accessible name picks out. */
export function selectOption(app: App, name: string): Promise<void> {
  return app.press(`role:option[${name}]`);
}

/** How many options show the selected marker. */
export function selectedOptions(app: App): number {
  return app.count("text:✓");
}
