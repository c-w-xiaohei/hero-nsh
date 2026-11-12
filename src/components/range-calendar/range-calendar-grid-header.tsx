import type { JSX, ViewProps, ViewRef } from "nsh";
import { split, View } from "nsh";

import { renderChildren } from "../calendar/children";
import { useRangeCalendarContext } from "./range-calendar-context";

export interface RangeCalendarGridHeaderProps
  extends Omit<ViewProps, "children" | "class" | "ref"> {
  /** Builds one header cell per weekday label; required upstream. */
  children: (day: string) => JSX.Element;
  className?: string;
  ref?: (node: ViewRef) => void;
}

/**
 * `RangeCalendar.GridHeader`: the weekday row, hidden from assistive
 * technologies (R-006, R-021).
 *
 * STUB for the core phase (port sheet §6): the public props type is final, the
 * body is a placeholder. The real part maps `RangeCalendarGridContext`'s
 * `weekDays` through `children` into a seven-column grid.
 */
export function RangeCalendarGridHeader(props: RangeCalendarGridHeaderProps): JSX.Element {
  const { slots } = useRangeCalendarContext();
  const [local, rest] = split(props, ["children", "className", "ref"]);
  const child = typeof local.children === "function" ? null : renderChildren(local.children as JSX.Element);

  return (
    <View
      {...rest}
      ref={(node) => local.ref?.(node)}
      class={`${slots.gridHeader()} ${local.className ?? ""}`}
    >
      {child}
    </View>
  );
}
