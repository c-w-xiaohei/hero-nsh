import type { JSX, ViewProps, ViewRef } from "nsh";
import { split, View } from "nsh";
import type { CalendarDate, DateDuration } from "@internationalized/date";

import { renderChildren } from "../calendar/children";
import type { WeekdayStyle } from "../calendar/date-utils";
import { useRangeCalendarContext } from "./range-calendar-context";

export interface RangeCalendarGridProps extends Omit<ViewProps, "children" | "class" | "ref"> {
  /** An element tree, or a function that builds one cell per date. */
  children?: JSX.Element | ((date: CalendarDate) => JSX.Element);

  /** How far from the visible range's start this grid begins (multi-month). */
  offset?: DateDuration;

  /** Weekday label style. @default "short" */
  weekdayStyle?: WeekdayStyle;

  className?: string;
  ref?: (node: ViewRef) => void;
}

/**
 * `RangeCalendar.Grid`: one date grid, a column container whose header and
 * every row are their own seven-column grids (R-005, R-019…R-023, R-053).
 *
 * STUB for the core phase (port sheet §6): the public props type is final, the
 * body is a placeholder. The real part provides `RangeCalendarGridContext`
 * (rows, weekday labels, grid label, cell focus hooks), forwards `onLayout` to
 * the year panel's layout context and binds the grid's keys.
 */
export function RangeCalendarGrid(props: RangeCalendarGridProps): JSX.Element {
  const { slots } = useRangeCalendarContext();
  const [local, rest] = split(props, ["children", "offset", "weekdayStyle", "className", "ref"]);
  const child = typeof local.children === "function" ? null : renderChildren(local.children as JSX.Element);

  return (
    <View
      {...rest}
      ref={(node) => local.ref?.(node)}
      class={`${slots.grid()} ${local.className ?? ""}`}
    >
      {child}
    </View>
  );
}
