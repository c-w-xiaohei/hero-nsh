import type { App } from "nsh/test";
import { callsOf } from "../helpers/calls";

/*
 * Probe readers for DateField (port sheet 4b.3). The fixture records the
 * Segment className render props and the `onChange` payloads into Storage;
 * these helpers turn that log into the last value per segment type.
 *
 * This is not a User tester: the upstream DateField cases drive the field with
 * `click` / `keyboard` / `tab` only, and `nsh/test`'s `press` /
 * `keyboard.press` steps stand in for them one for one (port sheet 4b, "需要的
 * 测试器：不需要 User 测试器"). Nothing here drives the app; the two test files
 * take the steps directly.
 *
 * `DateValue` does not survive the probe's JSON round trip, so the fixture
 * records `value.toString()` and `lastChange` hands it back as `{ text }`
 * (port sheet 4b.3).
 */

/** What the fixture records once per Segment render. */
export type DateSegmentProps = {
  type: string;
  isFocused: boolean;
  isFocusVisible: boolean;
};

function records<T>(app: App, name: string): T[] {
  return callsOf(app, name).map((args) => args[0] as T);
}

/** The last Segment className render-prop record for `type` (`month`, `day`, `year`). */
export function lastSegmentProps(app: App, type: string, name = "segment-props"): DateSegmentProps {
  const all = records<DateSegmentProps>(app, name).filter((record) => record.type === type);
  const found = all[all.length - 1];

  if (!found) throw new Error(`no className record for the ${type} segment`);

  return found;
}

/** The last `onChange` value, as `toString()` wrote it. */
export function lastChange(app: App, name = "onChange"): { text: string } {
  const calls = callsOf(app, name);
  const found = calls[calls.length - 1];

  if (!found) throw new Error("the fixture recorded no onChange call");

  return { text: found[0] as string };
}

/** How many times the field reported a value. */
export function changeCount(app: App, name = "onChange"): number {
  return callsOf(app, name).length;
}
