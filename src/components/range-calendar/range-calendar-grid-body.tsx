import type { JSX, ViewProps, ViewRef } from "nsh";
import { split, View } from "nsh";
import type { CalendarDate } from "@internationalized/date";

import { renderChildren } from "../calendar/children";
import { useRangeCalendarContext } from "./range-calendar-context";

export interface RangeCalendarGridBodyProps
  extends Omit<ViewProps, "children" | "class" | "ref"> {
  /** Builds one cell per date; required upstream. */
  children: (date: CalendarDate) => JSX.Element;
  className?: string;
  ref?: (node: ViewRef) => void;
}

/**
 * `RangeCalendar.GridBody`: one row view per week (R-007, R-022, R-023).
 *
 * STUB for the core phase (port sheet §6): the public props type is final, the
 * body is a placeholder. The real part wraps every cell it builds in a
 * `RangeCalendarRowContext.Provider` carrying its column, the row's column
 * count and whether each neighbour is an outside-month day (the track's
 * rounding rules R-035/R-036/R-047/R-048), and renders an empty view for a
 * padding slot.
 */
export function RangeCalendarGridBody(props: RangeCalendarGridBodyProps): JSX.Element {
  const { slots } = useRangeCalendarContext();
  const [local, rest] = split(props, ["children", "className", "ref"]);
  const child = typeof local.children === "function" ? null : renderChildren(local.children as JSX.Element);

  return (
    <View
      {...rest}
      ref={(node) => local.ref?.(node)}
      class={`${slots.gridBody()} ${local.className ?? ""}`}
    >
      {child}
    </View>
  );
}
