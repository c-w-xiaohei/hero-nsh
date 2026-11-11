import type { JSX, ViewProps, ViewRef } from "nsh";
import { split, View } from "nsh";

import { useCalendarContext, useCalendarGridContext } from "./calendar-context";

export interface CalendarGridHeaderProps extends Omit<ViewProps, "children" | "class" | "ref"> {
  /** Builds one header cell per weekday label; required upstream. */
  children: (day: string) => JSX.Element;
  className?: string;
  ref?: (node: ViewRef) => void;
}

/**
 * `Calendar.GridHeader`: the hidden weekday row (R-006/R-021). Upstream is a
 * `thead` with `display:contents`; NSH renders it as its own seven-column grid.
 */
export function CalendarGridHeader(props: CalendarGridHeaderProps): JSX.Element {
  const { slots } = useCalendarContext();
  const grid = useCalendarGridContext();
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
        {(day) => local.children(day())}
      </Each>
    </View>
  );
}
