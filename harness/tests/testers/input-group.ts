import type { App } from "nsh/test";
import { callsOf } from "../helpers/calls";

/*
 * Probe readers for InputGroup (port sheet 4b.3). The fixture records the
 * input's focus / blur into Storage because `nsh/test` cannot query focus, and
 * upstream's `toHaveFocus()` is the one fact T-016 / T-017 read.
 *
 * This is not a User tester: the upstream InputGroup cases only press parts,
 * and `app.press` stands in for `user.click` one for one (port sheet 4b,
 * "需要的测试器：不需要 User 测试器").
 */

/** What the fixture records on each focus / blur. */
export type InputGroupFocusRecord = {
  part: string;
  focused: boolean;
};

/** The last focus record for `part` (`input`), i.e. whether it holds the focus now. */
export function lastFocus(app: App, part: string, name = "focus"): boolean {
  const records = callsOf(app, name)
    .map((args) => args[0] as InputGroupFocusRecord)
    .filter((record) => record.part === part);
  const found = records[records.length - 1];

  if (!found) throw new Error(`the fixture recorded no focus event for ${part}`);

  return found.focused;
}

/** How many focus / blur events the fixture recorded for `part`, or for every part. */
export function focusCount(app: App, part?: string, name = "focus"): number {
  const records = callsOf(app, name).map((args) => args[0] as InputGroupFocusRecord);

  return part === undefined ? records.length : records.filter((record) => record.part === part).length;
}
