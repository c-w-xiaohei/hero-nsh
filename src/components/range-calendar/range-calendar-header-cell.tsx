import type { JSX, ViewProps, ViewRef } from "nsh";
import { split, Text } from "nsh";

import { renderChildren } from "../calendar/children";
import { useRangeCalendarContext } from "./range-calendar-context";

export interface RangeCalendarHeaderCellProps
  extends Omit<ViewProps, "children" | "class" | "ref"> {
  children?: JSX.Element;
  className?: string;
  ref?: (node: ViewRef) => void;
}

/**
 * `RangeCalendar.HeaderCell`: one weekday label (R-024).
 *
 * Upstream renders React Aria's `CalendarHeaderCell`, whose `th` carries
 * `role="columnheader"`; the T-002 label count reads that role. The class string
 * (R-024, `block min-w-0 truncate pb-2 text-center …`) is the `headerCell` slot.
 */
export function RangeCalendarHeaderCell(props: RangeCalendarHeaderCellProps): JSX.Element {
  const { slots } = useRangeCalendarContext();
  const [local, rest] = split(props, ["children", "className", "ref"]);

  return (
    <Text
      {...rest}
      ref={(node) => local.ref?.(node)}
      role="columnheader"
      class={`${slots.headerCell()} ${local.className ?? ""}`}
    >
      {renderChildren(local.children as JSX.Element)}
    </Text>
  );
}
