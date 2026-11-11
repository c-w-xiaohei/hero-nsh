import type { JSX, ViewProps, ViewRef } from "nsh";
import { split, Text } from "nsh";

import { useCalendarContext } from "./calendar-context";

export interface CalendarHeaderCellProps extends Omit<ViewProps, "children" | "class" | "ref"> {
  children?: JSX.Element;
  className?: string;
  ref?: (node: ViewRef) => void;
}

/** `Calendar.HeaderCell`: one weekday label (R-024). */
export function CalendarHeaderCell(props: CalendarHeaderCellProps): JSX.Element {
  const { slots } = useCalendarContext();
  const [local, rest] = split(props, ["children", "className", "ref"]);

  return (
    <Text
      {...rest}
      ref={(node) => local.ref?.(node)}
      role="columnheader"
      class={`${slots.headerCell()} ${local.className ?? ""}`}
    >
      {local.children}
    </Text>
  );
}
