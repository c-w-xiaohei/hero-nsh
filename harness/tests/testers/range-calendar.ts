import type { App } from "nsh/test";
import { callsOf } from "../helpers/calls";
import { dayCellSelector, dayLayouts } from "./calendar";
import type { PartLayout } from "./calendar";

/*
 * Probe readers for RangeCalendar (port sheet 4b, "需要的测试器"). The readers
 * that the Calendar unit already wrote — `dayCellSelector`, `pressDay`,
 * `openYearPicker`, `selectYear`, the `onLayout` readers — are re-exported
 * here so a RangeCalendar test imports one module; the rest is what a range
 * adds: the `onChange` payloads, a day number's resolved style and the cells of
 * one grid row (and of the row under it, for the row pitch).
 */

export type { PartLayout } from "./calendar";

export {
  dayCellLabel,
  dayCellSelector,
  dayLayout,
  dayLayouts,
  headerLayouts,
  LAYOUT_TOLERANCE,
  lastLayout,
  layouts,
  latestLayouts,
  openYearPicker,
  pressDay,
  rightOf,
  selectYear,
} from "./calendar";

/** One `onChange` payload: the two ISO dates the upstream test reads. */
export type RangeValueIso = { start: string; end: string };

/** Every `{start, end}` payload the root's `onChange` recorded, in order. */
export function rangeValues(app: App): RangeValueIso[] {
  return callsOf(app, "range-change").map((args) => args[0] as RangeValueIso);
}

/** The last recorded payload, or null before the first `onChange`. */
export function lastRangeValue(app: App): RangeValueIso | null {
  const values = rangeValues(app);

  return values[values.length - 1] ?? null;
}

/** The resolved style of a day cell's number, as `nsh/test` reports it. */
export function dayNumberStyle(app: App, iso: string) {
  const day = Number(iso.split("-")[2]);

  return app.spanStyle(`${dayCellSelector(iso)} >> text:${day}`);
}

/** The cells of the grid row that holds `iso`, left to right. */
export function rowCells(app: App, iso: string): PartLayout[] {
  const cells = dayLayouts(app);
  const target = cells.find((cell) => cell.name === `day-${iso}`);

  if (!target) throw new Error(`no layout recorded for day-${iso}`);

  return cells
    .filter((cell) => Math.abs(cell.y - target.y) <= 0.5)
    .sort((left, right) => left.x - right.x);
}

/** The row directly under the one that holds `iso`, left to right. */
export function rowBelow(app: App, iso: string): PartLayout[] {
  const first = rowCells(app, iso);
  const below = dayLayouts(app).filter((cell) => cell.y > first[0]!.y + 0.5);

  if (below.length === 0) throw new Error(`no row under day-${iso}`);

  const y = Math.min(...below.map((cell) => cell.y));
  const head = below.find((cell) => Math.abs(cell.y - y) <= 0.5)!;

  return rowCells(app, head.name.replace(/^day-/, ""));
}
