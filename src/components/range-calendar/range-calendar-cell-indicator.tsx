import type { JSX, ViewProps, ViewRef } from "nsh";
import { split, View } from "nsh";

import { RangeCalendarCellContext, useRangeCalendarContext } from "./range-calendar-context";

export interface RangeCalendarCellIndicatorProps
  extends Omit<ViewProps, "children" | "class" | "ref"> {
  children?: JSX.Element;
  className?: string;
  ref?: (node: ViewRef) => void;
}

/**
 * `RangeCalendar.CellIndicator`: the dot under a day (R-049, the `cellIndicator`
 * slot). Upstream paints it from a descendant selector
 * (`[data-selected="true"] > &`), which the host cannot express: the owning
 * `RangeCalendar.Cell` publishes its selected state through
 * `RangeCalendarCellContext` instead (R-050, port sheet §4). Outside a cell
 * there is no context and the dot keeps the muted colour.
 */
export function RangeCalendarCellIndicator(props: RangeCalendarCellIndicatorProps): JSX.Element {
  const { slots } = useRangeCalendarContext();
  const cell = RangeCalendarCellContext();
  const [local, rest] = split(props, ["children", "className", "ref"]);

  return (
    <View
      {...rest}
      ref={(node) => local.ref?.(node)}
      accessibilityElementsHidden
      class={`${slots.cellIndicator()} ${
        // R-050: inside a selected cell the dot takes the accent foreground.
        cell?.isSelected() ? "bg-accent-foreground" : ""
      } ${local.className ?? ""}`}
    >
      {local.children}
    </View>
  );
}
