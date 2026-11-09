import type { App } from "nsh/test";

/*
 * The CheckboxGroup tester for the ported createTester cases (port sheet 4b),
 * replacing React Aria's `CheckboxGroupTester`. It only names selectors and
 * steps; every assertion stays in the test.
 *
 * `harness/checkbox.fixtures.tsx` gives each item in `case=group-log` a visible
 * `✓` beside it while selected (the NSH stand-in for `aria-checked`) and the
 * group two items in order, Coding then Design, so a keyboard toggle can Tab to
 * the item by its index.
 */

/** How many checkboxes the open group shows. */
export function getCheckboxes(app: App): number {
  return app.count("role:checkbox");
}

/** How many checkboxes show the selected marker. */
export function getSelectedCheckboxes(app: App): number {
  return app.count("role:group >> text:✓");
}

/** Presses the checkbox the accessible name picks out. */
export function toggleCheckbox(app: App, name: string): Promise<void> {
  return app.press(`role:checkbox[${name}]`);
}

/**
 * Moves the keyboard focus to the named checkbox with Tab, then presses Space.
 * Upstream's tester focuses the group's first checkbox and tabs to the target;
 * NSH cannot focus a view from a test, so the first Tab is the first item and
 * `names` gives the visual order the tabs walk.
 */
export async function toggleCheckboxByKeyboard(
  app: App,
  names: string[],
  name: string,
): Promise<void> {
  const index = names.indexOf(name);

  if (index < 0) throw new Error(`no checkbox named ${name} in the group`);

  for (let step = 0; step <= index; step += 1) {
    await app.keyboard.press("tab");
  }

  await app.keyboard.press("space");
}
