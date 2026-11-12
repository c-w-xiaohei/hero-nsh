import type { JSX, ViewProps, ViewRef } from "nsh";
import { split, View } from "nsh";

import { renderChildren } from "../calendar/children";
import { useRangeCalendarContext, useRangeCalendarGridContext } from "./range-calendar-context";

export interface RangeCalendarGridHeaderProps
  extends Omit<ViewProps, "children" | "class" | "ref"> {
  /** Builds one header cell per weekday label; required upstream. */
  children: (day: string) => JSX.Element;
  className?: string;
  ref?: (node: ViewRef) => void;
}

/**
 * `RangeCalendar.GridHeader`: the weekday row, hidden from assistive
 * technologies.
 *
 * Upstream is a `thead` whose rows are `display:contents`; NSH has neither, so
 * the header is a real row view that carries the seven columns itself
 * (R-006/R-021) and maps the grid's weekday labels through `children`.
 */
export function RangeCalendarGridHeader(props: RangeCalendarGridHeaderProps): JSX.Element {
  const { slots } = useRangeCalendarContext();
  const grid = useRangeCalendarGridContext();
  const [local, rest] = split(props, ["children", "className", "ref"]);

  return (
    <View
      {...rest}
      ref={(node) => local.ref?.(node)}
      role="row"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      class={`${slots.gridHeader()} ${local.className ?? ""}`}
    >
      <Each of={grid.weekDays()} key="index">
        {(day) => renderChildren(local.children(day()))}
      </Each>
    </View>
  );
}
