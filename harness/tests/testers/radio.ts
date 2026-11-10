import type { App } from "nsh/test";

/*
 * The RadioGroup tester for the ported cases (port sheet 4b, replacing React
 * Aria's `RadioGroupTester` in `@react-aria/test-utils`).
 *
 * aria-checked has no NSH query, so the fixtures render a per-item marker that
 * carries the item's name and its selected state ("Dogs:selected" /
 * "Dogs:unselected"). `getSelectedRadio` reads the selected name off that
 * marker; the other two keep the upstream tester's shape.
 */

/** How many radios the group shows. */
export function getRadios(app: App): number {
  return app.count("role:radio");
}

/** The name of the radio that shows the selected marker, or null. */
export function getSelectedRadio(app: App): string | null {
  const marker = app.texts().find((text) => text.endsWith(":selected"));

  return marker ? marker.slice(0, -":selected".length) : null;
}

/** Presses the radio the accessible name picks out. */
export function triggerRadio(app: App, name: string): Promise<void> {
  return app.press(`role:radio[${name}]`);
}
