import type { App } from "nsh/test";
import { callsOf } from "../helpers/calls";

/*
 * The Accordion tester for the ported cases (port sheet 4b, replacing React
 * Aria's `User` tester).
 *
 * It holds selectors and steps only; every assertion stays in the case. The
 * accessible name of a trigger comes from its text, so a plain label picks it
 * out. `nsh/test` cannot read aria attributes or focus, so the fixture records
 * the expansion callbacks and the focus events in Storage and these helpers
 * read them back (see harness/accordion.fixtures.tsx).
 */

/** Presses the trigger whose label picks it out. */
export function trigger(app: App, label: string): Promise<void> {
  return app.press(`role:button[${label}]`);
}

/** Whether the panel content is on screen now (a closed panel clips it away). */
export function panelText(app: App, text: string): boolean {
  return app.shows(`text:${text}`);
}

/** The `onExpandedChange` payloads, each the expanded keys as an array. */
export function expandedCalls(app: App): unknown[][] {
  return callsOf(app, "expandedChange");
}

/** The item-level `onExpandedChange` values, each a boolean. */
export function itemExpandedCalls(app: App): unknown[][] {
  return callsOf(app, "itemExpanded");
}

/** The keys whose trigger heard a focus event, in order. */
export function focusTrail(app: App): string[] {
  return callsOf(app, "focus").map((call) => String(call[0]));
}
