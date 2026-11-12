import type { App } from "nsh/test";
import { callsOf } from "../helpers/calls";

/*
 * Probe readers for DatePicker (port sheet 4b, "需要的测试器"). The fixture and
 * the geometry scenarios record three things into Storage: the root's
 * `onChange` payload as `{year, month, day}` (a `DateValue` does not survive the
 * probe's JSON round trip), the trigger's `onFocus` arrivals, and every probed
 * part's bounds.
 *
 * This is not a User tester: the upstream DatePicker cases drive the component
 * with `click` / `keyboard` only, and `nsh/test`'s `press` / `keyboard.press`
 * steps stand in for them one for one (port sheet 4b: "不需要 User 测试器").
 * Nothing here drives the app; the test files take the steps directly.
 */

/** What the fixture records per `onChange`, or `null` for a cleared value. */
export type ChangeRecord = { year: number; month: number; day: number } | null;

/** Every `onChange` payload, in order. */
export function changeRecords(app: App, name = "onChange"): ChangeRecord[] {
  return callsOf(app, name).map((args) => args[0] as ChangeRecord);
}

/** How many times the picker reported a value. */
export function changeCount(app: App, name = "onChange"): number {
  return callsOf(app, name).length;
}

/** How many times the trigger took the focus: the Escape focus-return fact (T-006). */
export function triggerFocusCount(app: App, name = "trigger-focus"): number {
  return callsOf(app, name).length;
}

/** What an `onLayout` probe recorded for one part. */
export type PartLayout = {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

export function layouts(app: App, name = "layout"): PartLayout[] {
  return callsOf(app, name).map((args) => args[0] as PartLayout);
}

/** One layout per name: the last call, because a part reports again when it moves. */
export function latestLayouts(app: App, name = "layout"): PartLayout[] {
  const byName = new Map<string, PartLayout>();

  for (const call of layouts(app, name)) byName.set(call.name, call);

  return [...byName.values()];
}

export function lastLayout(app: App, part: string, name = "layout"): PartLayout {
  const found = latestLayouts(app, name).find((call) => call.name === part);

  if (!found) throw new Error(`no layout recorded for ${part}`);

  return found;
}

export const LAYOUT_TOLERANCE = 1;

export function rightOf(part: PartLayout): number {
  return part.x + part.width;
}

export function bottomOf(part: PartLayout): number {
  return part.y + part.height;
}
