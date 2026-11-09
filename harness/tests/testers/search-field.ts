import type { App } from "nsh/test";
import { callsOf } from "../helpers/calls";

/*
 * Probe readers for SearchField (port sheet 4b).
 *
 * The fixtures record the Root / Group / Input render props into Storage,
 * because `nsh/test` cannot read `data-empty` / `data-focus-visible` or any
 * other DOM attribute (D18). Nothing here drives the app: the test files take
 * the steps directly, as the port sheet asks.
 *
 * Record names:
 *   "root-props"   `search-field/empty.split`
 *   "group-props"  `search-field/focus.split`
 *   "input-props"  `search-field/focus.split`
 */

export type RootRecord = {
  isEmpty: boolean;
  isDisabled: boolean;
  isInvalid: boolean;
  isReadOnly: boolean;
  isRequired: boolean;
};

export type GroupRecord = {
  isHovered: boolean;
  isFocusWithin: boolean;
  isFocusVisible: boolean;
  isDisabled: boolean;
  isInvalid: boolean;
};

export type InputRecord = {
  isHovered: boolean;
  isFocused: boolean;
  isFocusVisible: boolean;
  isDisabled: boolean;
  isInvalid: boolean;
};

function lastOf<T>(app: App, name: string): T {
  const records = callsOf(app, name).map((args) => args[0] as T);
  const found = records[records.length - 1];

  if (!found) throw new Error(`the fixture recorded no ${name} call`);

  return found;
}

/** The last Root render-prop call (the empty state, T-006). */
export function lastRoot(app: App, name = "root-props"): RootRecord {
  return lastOf<RootRecord>(app, name);
}

/** The last Group render-prop call (hover / focus-within). */
export function lastGroup(app: App, name = "group-props"): GroupRecord {
  return lastOf<GroupRecord>(app, name);
}

/** The last Input render-prop call (focused / focus-visible, T-009). */
export function lastInput(app: App, name = "input-props"): InputRecord {
  return lastOf<InputRecord>(app, name);
}
