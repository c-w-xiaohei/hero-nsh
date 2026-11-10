import type { App } from "nsh/test";

/*
 * The TagGroup tester for the ported cases (port sheet 4b, replacing React
 * Aria's `ListBox` tester, which TagGroup has no dedicated version of).
 *
 * `focusedTag` reads the shared `▶` marker the fixtures render from the Tag's
 * `isFocused` render prop: focus is virtual (the list holds it, `focusedKey`
 * names the row), so no query can see a focused element.
 */

/** How many rows the grid shows. */
export function rows(app: App): number {
  return app.count("role:row");
}

/** Presses the row the accessible name picks out. */
export function selectTag(app: App, name: string): Promise<void> {
  return app.press(`role:row[${name}]`);
}

/** The selector of the row's remove button, named "Remove tag <name>". */
export function removeButton(name: string): string {
  return `role:button[Remove tag ${name}]`;
}

/** Whether a row shows the focus marker. */
export function focusedTag(app: App): boolean {
  return app.shows("text:▶");
}
