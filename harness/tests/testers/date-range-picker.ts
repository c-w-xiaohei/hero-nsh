import type { App } from "nsh/test";
import { callsOf } from "../helpers/calls";
import { latestLayouts } from "./calendar";
import type { PartLayout } from "./calendar";

/*
 * Probe readers for DateRangePicker (port sheet 4b, "需要的测试器"). The fixture
 * and the geometry scenarios record three things into Storage: the root's
 * `onChange` payload as `{start, end}` with each date as `{year, month, day}` (a
 * `DateValue` does not survive the probe's JSON round trip), the trigger's
 * `onFocus` arrivals, and every probed part's bounds.
 *
 * This is not a User tester: the upstream DateRangePicker cases drive the
 * component with `click` / `keyboard` only, and `nsh/test`'s `press` /
 * `keyboard.press` steps stand in for them one for one (port sheet 4b: "不需要
 * User 测试器"). Nothing here drives the app; the test files take the steps
 * directly.
 *
 * The bound readers that the Calendar / RangeCalendar unit already wrote —
 * `PartLayout`, `LAYOUT_TOLERANCE`, `latestLayouts`, `rightOf` — are reused;
 * `layoutOf` is the name the port sheet gives the reader, `lastLayout` with the
 * sheet's signature.
 */

export type { PartLayout } from "./calendar";

export { LAYOUT_TOLERANCE, rightOf } from "./calendar";

/** One end of a recorded range, as the fixture writes it. */
export type DateRecord = { year: number; month: number; day: number };

/** What the fixture records per `onChange`, or `null` for a cleared value. */
export type RangeRecord = { start: DateRecord; end: DateRecord } | null;

/** Every `onChange` payload, in order. */
export function rangeRecords(app: App, name = "onChange"): RangeRecord[] {
  return callsOf(app, name).map((args) => args[0] as RangeRecord);
}

/** How many times the picker reported a range. */
export function rangeCount(app: App, name = "onChange"): number {
  return callsOf(app, name).length;
}

/** The last range the picker reported, or `undefined` before the first `onChange`. */
export function lastRange(app: App, name = "onChange"): RangeRecord | undefined {
  const records = rangeRecords(app, name);

  return records[records.length - 1];
}

/** One recorded date as the ISO string the upstream assertions compare. */
export function isoOf(date: DateRecord): string {
  const pad = (value: number) => String(value).padStart(2, "0");

  return `${date.year}-${pad(date.month)}-${pad(date.day)}`;
}

/** How many times the trigger took the focus: the Escape focus-return fact (T-006). */
export function triggerFocusCount(app: App, name = "trigger-focus"): number {
  return callsOf(app, name).length;
}

/**
 * What an `onLayout` probe recorded for one part. Bounds are relative to the
 * part's parent, so this only compares parts that share one (`_common.md`:
 * `ViewRef.measure`).
 */
export function layoutOf(app: App, part: string, name = "layout"): PartLayout {
  const found = latestLayouts(app).find((call) => call.name === part);

  if (!found) throw new Error(`no layout recorded for ${part}`);

  return found;
}

/** A part's bottom edge, in its parent's coordinates. */
export function bottomOf(part: PartLayout): number {
  return part.y + part.height;
}
