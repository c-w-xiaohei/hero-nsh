import type { JSX, ViewProps, ViewRef } from "nsh";
import { split, View } from "nsh";
import type { CalendarDate } from "@internationalized/date";

import { useCalendarContext, useCalendarGridContext } from "./calendar-context";

export interface CalendarGridBodyProps extends Omit<ViewProps, "children" | "class" | "ref"> {
  /** Builds one cell per date; required upstream. */
  children: (date: CalendarDate) => JSX.Element;
  className?: string;
  ref?: (node: ViewRef) => void;
}

/**
 * `Calendar.GridBody`: one row view per week (R-007/R-022). A `null` date is a
 * padding slot and renders an empty view so columns stay aligned.
 */
export function CalendarGridBody(props: CalendarGridBodyProps): JSX.Element {
  const { slots } = useCalendarContext();
  const grid = useCalendarGridContext();
  const [local, rest] = split(props, ["children", "className", "ref"]);

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
              {(date) => (date() ? local.children(date()!) : <View />)}
            </Each>
          </View>
        )}
      </Each>
    </View>
  );
}
