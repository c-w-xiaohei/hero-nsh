import type { App } from "nsh/test";
import { callsOf } from "../helpers/calls";

/*
 * Probe readers for DateInputGroup (port sheet 4b.3). The fixture records the
 * Root / Segment render props and the segment list into Storage; these helpers
 * turn that log into the last value per key.
 *
 * Nothing here drives the app: the unit has no keyboard tester of its own, and
 * the two test files take the steps directly.
 */

export type RootRecord = {
  isHovered: boolean;
  isFocusWithin: boolean;
  isFocusVisible: boolean;
  isDisabled: boolean;
  isInvalid: boolean;
};

export type SegmentRecord = {
  type: string;
  text: string;
  isPlaceholder: boolean;
  isEditable: boolean;
};

export type SegmentPropsRecord = {
  type: string;
  isFocused: boolean;
  isHovered: boolean;
  isReadOnly: boolean;
  isInvalid: boolean;
  isDisabled: boolean;
};

function records<T>(app: App, name: string): T[] {
  const calls = callsOf(app, name);

  if (calls.length === 0) throw new Error(`the fixture recorded no ${name} call`);

  return calls.map((args) => args[0] as T);
}

function lastOf<T>(app: App, name: string): T {
  const all = records<T>(app, name);
  const found = all[all.length - 1];

  if (!found) throw new Error(`the fixture recorded no ${name} call`);

  return found;
}

/** The last render of the segment list for `type` (a literal segment shares one record). */
export function lastSegment(app: App, type: string, name = "segments"): SegmentRecord {
  const all = records<SegmentRecord>(app, name).filter((record) => record.type === type);
  const found = all[all.length - 1];

  if (!found) throw new Error(`no segment of type ${type} was rendered`);

  return found;
}

/** The last Segment `className` render-prop call for `type`. */
export function lastSegmentProps(
  app: App,
  type: string,
  name = "segment-props",
): SegmentPropsRecord {
  const all = records<SegmentPropsRecord>(app, name).filter((record) => record.type === type);
  const found = all[all.length - 1];

  if (!found) throw new Error(`no className record for the ${type} segment`);

  return found;
}

/** The last Root `className` render-prop call. */
export function rootRecord(app: App): RootRecord {
  return lastOf<RootRecord>(app, "root-props");
}

/** An Input `className` render-prop call, tagged with its `slot`. */
export type InputPropsRecord = {
  slot: string;
  isHovered: boolean;
  isFocusWithin: boolean;
  isFocusVisible: boolean;
  isDisabled: boolean;
  isInvalid: boolean;
};

/** The last Input `className` render-prop call for `slot` (the range fixture's two sides). */
export function lastInputProps(app: App, slot: string): InputPropsRecord {
  const all = records<InputPropsRecord>(app, "input-props").filter(
    (record) => record.slot === slot,
  );
  const found = all[all.length - 1];

  if (!found) throw new Error(`no className record for the ${slot} input`);

  return found;
}

/** A fake trigger's focus report, with the group accessors it read at the time. */
export type TriggerRecord = {
  focused: boolean;
  triggerFocused: boolean;
  isFocusWithin: boolean;
};

/** The last report of the fake trigger. */
export function triggerRecord(app: App): TriggerRecord {
  return lastOf<TriggerRecord>(app, "trigger");
}

/** Every value the provided field committed, as the fixture normalized it. */
export function fieldChanges(app: App): string[] {
  return callsOf(app, "field-change").map((args) => String(args[0]));
}
