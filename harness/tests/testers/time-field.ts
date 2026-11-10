import type { App } from "nsh/test";
import { callsOf } from "../helpers/calls";

/*
 * Probe readers for TimeField (port sheet 4b.3). The fixture records the
 * Segment className render props and the `onChange` payloads into Storage;
 * these helpers turn that log into the last value per segment type.
 *
 * This is not a User tester: the upstream TimeField cases drive the field with
 * `click` / `keyboard` / `tab` only, and `nsh/test`'s `press` /
 * `keyboard.press` steps stand in for them one for one (port sheet 4b, "需要的
 * 测试器：无"). Nothing here drives the app; the two test files take the steps
 * directly.
 */

/** What the fixture records once per Segment render. */
export type TimeSegmentProps = {
  type: string;
  isFocused: boolean;
  isFocusVisible: boolean;
};

/** The `onChange` payload, as the probe's JSON round trip leaves it. */
export type TimeChange = {
  hour: number;
  minute: number;
  second: number;
  millisecond: number;
};

function records<T>(app: App, name: string): T[] {
  return callsOf(app, name).map((args) => args[0] as T);
}

/** The last Segment className render-prop record for `type` (`hour`, `minute`, ...). */
export function lastSegmentProps(app: App, type: string, name = "segment-props"): TimeSegmentProps {
  const all = records<TimeSegmentProps>(app, name).filter((record) => record.type === type);
  const found = all[all.length - 1];

  if (!found) throw new Error(`no className record for the ${type} segment`);

  return found;
}

/** The last `onChange` payload. */
export function lastChange(app: App, name = "onChange"): TimeChange {
  const calls = callsOf(app, name);
  const found = calls[calls.length - 1];

  if (!found) throw new Error("the fixture recorded no onChange call");

  return found[0] as TimeChange;
}

/** How many times the field reported a value. */
export function changeCount(app: App, name = "onChange"): number {
  return callsOf(app, name).length;
}
