import type { App } from "nsh/test";
import { callsOf } from "../helpers/calls";
import { dayCellSelector, dayLayouts, LAYOUT_TOLERANCE } from "./calendar";
import type { PartLayout } from "./calendar";

/*
 * Probe readers for RangeCalendar (port sheet 4b, "需要的测试器"). The readers
 * that the Calendar unit already wrote — `dayCellSelector`, `pressDay`,
 * `openYearPicker`, `selectYear`, the `onLayout` readers — are re-exported
 * here so a RangeCalendar test imports one module; the rest is what a range
 * adds: the `onChange` payloads, a day number's resolved style, the grid's week
 * rows and the row under a given day.
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

/*
 * Grid rows. An `onLayout` `bounds` is a view's frame in its parent
 * (nsh/types.d.ts `ViewRef.measure`), and a day cell's parent is its week row
 * (port sheet R-023: every week is a real `View role="row"`, NSH has no
 * `display:contents`). Each cell therefore reports `y: 0` inside its own row,
 * and no cell's `y` says anything about which row it is in — rows cannot be
 * grouped by `y`.
 *
 * What the parent-relative geometry does carry: inside one row the cells sit
 * left to right at increasing row-local `x` (row views are full width, so
 * column 1 is at the row's 0 and column 7 ends at the row's right edge), while
 * the first cell of every following row restarts at the row's left edge. The
 * cells in date order cut into rows where `x` increases, a row ending where the
 * next cell's `x` does not.
 */

/** Every day cell, oldest first. */
function cellsByDate(app: App): PartLayout[] {
  return dayLayouts(app)
    .slice()
    .sort((left, right) => (left.name < right.name ? -1 : left.name > right.name ? 1 : 0));
}

/** The grid's week rows, top to bottom; each row's cells left to right. */
export function weekRows(app: App): PartLayout[][] {
  const rows: PartLayout[][] = [];

  for (const cell of cellsByDate(app)) {
    const row = rows[rows.length - 1];
    const previous = row?.[row.length - 1];

    if (previous && cell.x > previous.x + LAYOUT_TOLERANCE) row.push(cell);
    else rows.push([cell]);
  }

  return rows;
}

/** The cells of the grid row that holds `iso`, left to right. */
export function rowCells(app: App, iso: string): PartLayout[] {
  const row = weekRows(app).find((cells) => cells.some((cell) => cell.name === `day-${iso}`));

  if (!row) throw new Error(`no layout recorded for day-${iso}`);

  return row;
}

/** The row directly under the one that holds `iso`, left to right. */
export function rowBelow(app: App, iso: string): PartLayout[] {
  const rows = weekRows(app);
  const index = rows.findIndex((cells) => cells.some((cell) => cell.name === `day-${iso}`));

  if (index < 0) throw new Error(`no layout recorded for day-${iso}`);

  const below = rows[index + 1];

  if (!below) throw new Error(`no row under day-${iso}`);

  return below;
}
