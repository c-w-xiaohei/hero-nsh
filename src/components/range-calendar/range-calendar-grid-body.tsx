import type { JSX, ViewProps, ViewRef } from "nsh";
import { split, View } from "nsh";
import type { CalendarDate } from "@internationalized/date";
import { isSameMonth } from "@internationalized/date";

import { renderChildren } from "../calendar/children";
import {
  RangeCalendarRowContext,
  useRangeCalendarContext,
  useRangeCalendarGridContext,
} from "./range-calendar-context";
import type { RangeCalendarRowValue } from "./range-calendar-context";

export interface RangeCalendarGridBodyProps
  extends Omit<ViewProps, "children" | "class" | "ref"> {
  /** Builds one cell per date; required upstream. */
  children: (date: CalendarDate) => JSX.Element;
  className?: string;
  ref?: (node: ViewRef) => void;
}

/**
 * `RangeCalendar.GridBody`: one row view per week.
 *
 * Upstream's `tbody` and `tr` are `display:contents` layers, so NSH renders the
 * body as a column container and every week as a real row with its own seven
 * columns (R-007/R-022/R-023). A `null` date is a padding slot and renders an
 * empty view so the columns stay aligned.
 *
 * The cell track's rounding and its break at a month boundary depend on where
 * the cell sits in its row and on whether its neighbours are outside-month
 * days; NSH has no `:first-child`/`:has()`/sibling selectors, so each cell is
 * wrapped in a `RangeCalendarRowContext.Provider` carrying those four values
 * (port sheet §3). A padding slot gets no provider: upstream has no `td` there,
 * so no positional rule applies.
 */
export function RangeCalendarGridBody(props: RangeCalendarGridBodyProps): JSX.Element {
  const { slots } = useRangeCalendarContext();
  const grid = useRangeCalendarGridContext();
  const [local, rest] = split(props, ["children", "className", "ref"]);

  // RAC marks a day `data-outside-month` against the visible range's start
  // month, in every view (same rule as `Calendar.Cell`); the four values are
  // read from the row the cell belongs to, so they stay right across paging.
  const rowValue = (
    row: () => readonly (CalendarDate | null)[],
    index: () => number,
  ): RangeCalendarRowValue => {
    const dates = row();
    const column = index();
    const month = grid.startDate();
    const isOutsideMonth = (date: CalendarDate | null | undefined) =>
      date != null && !isSameMonth(date, month);

    return {
      column,
      // A narrow day view under a week puts `days` slots in its row; every other
      // view is a full seven (R-019 keeps the grid seven columns either way).
      columnCount: dates.length,
      previousOutsideMonth: column > 0 && isOutsideMonth(dates[column - 1]),
      nextOutsideMonth: column < dates.length - 1 && isOutsideMonth(dates[column + 1]),
    };
  };

  return (
    <View
      {...rest}
      ref={(node) => local.ref?.(node)}
      class={`${slots.gridBody()} ${local.className ?? ""}`}
    >
      <Each of={grid.rows()} key="index">
        {(row) => (
          <View role="row" class={slots.gridRow()}>
            <Each of={row()} key="index">
              {(date, index) =>
                date() ? (
                  <RangeCalendarRowContext.Provider value={rowValue(row, index)}>
                    {renderChildren(local.children(date()!))}
                  </RangeCalendarRowContext.Provider>
                ) : (
                  <View />
                )
              }
            </Each>
          </View>
        )}
      </Each>
    </View>
  );
}
