import type { App } from "nsh/test";
import { callsOf } from "../helpers/calls";

/*
 * The Tabs tester for the ported cases (port sheet 4b, replacing React Aria's
 * `User` tester).
 *
 * It holds selectors and steps only; every assertion stays in the case. A tab's
 * accessible name comes from its text, so `role:tab[Overview]` picks it out.
 * `nsh/test` cannot read aria attributes or focus, so the fixture records the
 * selection callbacks and the focus events in Storage and these helpers read
 * them back (see harness/tabs.fixtures.tsx).
 */

/** Presses the tab whose label picks it out. */
export function tab(app: App, label: string): Promise<void> {
  return app.press(`role:tab[${label}]`);
}

/** Whether the panel content is on screen now (an unselected panel is unmounted). */
export function panelText(app: App, text: string): boolean {
  return app.shows(`text:${text}`);
}

/** The `onSelectionChange` payloads, one per call. */
export function selectionCalls(app: App): unknown[][] {
  return callsOf(app, "selectionChange");
}

/** The ids whose tab heard a focus event, in order; the fixture's `after` station is included. */
export function focusTrail(app: App): string[] {
  return callsOf(app, "focus").map((call) => String(call[0]));
}
