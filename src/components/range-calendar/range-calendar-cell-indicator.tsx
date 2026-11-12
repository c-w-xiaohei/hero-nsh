import type { JSX, ViewProps, ViewRef } from "nsh";
import { split, View } from "nsh";

import { useRangeCalendarContext } from "./range-calendar-context";

export interface RangeCalendarCellIndicatorProps
  extends Omit<ViewProps, "children" | "class" | "ref"> {
  children?: JSX.Element;
  className?: string;
  ref?: (node: ViewRef) => void;
}

/**
 * `RangeCalendar.CellIndicator`: the dot under a day (R-049).
 *
 * STUB for the core phase (port sheet §6): the public props type is final, the
 * body is a placeholder. The real part is `aria-hidden`, and takes the accent
 * foreground inside a selected cell through `RangeCalendarCellContext` (R-050).
 */
export function RangeCalendarCellIndicator(props: RangeCalendarCellIndicatorProps): JSX.Element {
  const { slots } = useRangeCalendarContext();
  const [local, rest] = split(props, ["children", "className", "ref"]);

  return (
    <View
      {...rest}
      ref={(node) => local.ref?.(node)}
      accessibilityElementsHidden
      class={`${slots.cellIndicator()} ${local.className ?? ""}`}
    >
      {local.children}
    </View>
  );
}
