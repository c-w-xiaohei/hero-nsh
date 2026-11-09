import type { App } from "nsh/test";

/*
 * The Menu tester for the ported cases (port sheet 4b), replacing React Aria's
 * `Menu` test util. Every method is a thin wrapper over an `nsh test` step, so
 * a case reads like the upstream one.
 *
 * `selectedOptions` counts the `✓` marker the fixtures render from
 * `Menu.ItemIndicator`'s render prop; HeroUI's built-in checkmark and dot are
 * Views without text, which `nsh test` cannot count (port sheet 4b).
 */

/** Whether a menu is on screen. */
export function menu(app: App): boolean {
  return app.shows("role:menu");
}

/**
 * Presses the fixture's trigger (`id:menu-trigger`) and waits for the menu.
 * The fixture plays MenuTrigger + Popover with a button and a conditionally
 * mounted Menu (port sheet §5).
 */
export async function open(app: App): Promise<void> {
  await app.press("id:menu-trigger");
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

/** Presses Escape, the menu's own close channel (port sheet §5). */
export function close(app: App): Promise<void> {
  return app.keyboard.press("escape");
}
