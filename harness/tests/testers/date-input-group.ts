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
export function lastSegment(app: App, type: string): SegmentRecord {
  const all = records<SegmentRecord>(app, "segments").filter((record) => record.type === type);
  const found = all[all.length - 1];

  if (!found) throw new Error(`no segment of type ${type} was rendered`);

  return found;
}

/** The last Segment `className` render-prop call for `type`. */
export function lastSegmentProps(app: App, type: string): SegmentPropsRecord {
  const all = records<SegmentPropsRecord>(app, "segment-props").filter(
    (record) => record.type === type,
  );
  const found = all[all.length - 1];

  if (!found) throw new Error(`no className record for the ${type} segment`);

  return found;
}

/** The last Root `className` render-prop call. */
export function rootRecord(app: App): RootRecord {
  return lastOf<RootRecord>(app, "root-props");
}
