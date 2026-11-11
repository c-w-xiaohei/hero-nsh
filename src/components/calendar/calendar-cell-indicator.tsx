import type { JSX, ViewProps, ViewRef } from "nsh";
import { split, View } from "nsh";

import { useCalendarContext } from "./calendar-context";
import { CalendarCellContext } from "./calendar-context";

export interface CalendarCellIndicatorProps extends Omit<ViewProps, "children" | "class" | "ref"> {
  children?: JSX.Element;
  className?: string;
  ref?: (node: ViewRef) => void;
}

/**
 * `Calendar.CellIndicator`: the dot under a date (R-039). Its color follows
 * the owning cell's selected state (R-040), shared through context.
 */
export function CalendarCellIndicator(props: CalendarCellIndicatorProps): JSX.Element {
  const { slots } = useCalendarContext();
  const cell = CalendarCellContext();
  const [local, rest] = split(props, ["children", "className", "ref"]);

  return (
    <View
      {...rest}
      ref={(node) => local.ref?.(node)}
      accessibilityElementsHidden
      class={`${slots.cellIndicator()} ${
        // R-040: inside a selected cell the dot takes the accent foreground.
        cell?.isSelected() ? "bg-accent-foreground" : ""
      } ${local.className ?? ""}`}
    >
      {local.children}
    </View>
  );
}
