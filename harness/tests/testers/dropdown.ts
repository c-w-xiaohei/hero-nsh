import type { App } from "nsh/test";

/*
 * The Dropdown tester for the ported cases (port sheet 4b), replacing React
 * Aria's `Menu` test util. Each method is a thin wrapper over an `nsh test`
 * step, so a case reads like the upstream one.
 *
 * The trigger is matched by its accessible name: every fixture and shared
 * scenario gives `Dropdown.Trigger` / the trigger Button `aria-label="Menu"`
 * and the visible text `Actions` (port sheet 4b names the visible text).
 *
 * `selectedOptions` counts the `✓` marker the fixtures render from
 * `Dropdown.ItemIndicator`'s render prop; HeroUI's built-in checkmark and dot
 * are Views without text, which `nsh test` cannot count (port sheet 4b).
 */

/** Whether the trigger is on screen. */
export function trigger(app: App): boolean {
  return app.shows("role:button[Menu]");
}

/** Whether a menu is on screen. */
export function menu(app: App): boolean {
  return app.shows("role:menu");
}

/** Presses the trigger and waits for the menu, the upstream `MenuTester.open()` in mouse modality. */
export async function open(app: App): Promise<void> {
  await app.press("role:button[Menu]");
  await app.waitFor("role:menu");
}

/** How many rows the menu shows; single selection uses `menuitemradio`, multiple `menuitemcheckbox`. */
export function options(app: App, role = "menuitem"): number {
  return app.count(`role:${role}`);
}

/** Presses the row the accessible name picks out. */
export function selectOption(app: App, name: string, role = "menuitem"): Promise<void> {
  return app.press(`role:${role}[${name}]`);
}

/** How many rows show the selected marker. */
export function selectedOptions(app: App): number {
  return app.count("text:✓");
}

/** Presses Escape, the overlay's own close channel. */
export function close(app: App): Promise<void> {
  return app.keyboard.press("escape");
}
