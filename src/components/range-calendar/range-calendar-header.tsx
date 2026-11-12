import type { JSX, ViewProps, ViewRef } from "nsh";
import { split, View } from "nsh";

import { renderChildren } from "../calendar/children";
import { useRangeCalendarContext } from "./range-calendar-context";

export interface RangeCalendarHeaderProps extends Omit<ViewProps, "children" | "class" | "ref"> {
  children?: JSX.Element;
  className?: string;
  ref?: (node: ViewRef) => void;
}

/**
 * `RangeCalendar.Header`: the row above the date grid (R-008).
 *
 * STUB for the core phase (port sheet §6): the public props type is final, the
 * body is a placeholder that renders the children in the header slot's view.
 */
export function RangeCalendarHeader(props: RangeCalendarHeaderProps): JSX.Element {
  const { slots } = useRangeCalendarContext();
  const [local, rest] = split(props, ["children", "className", "ref"]);
  const child = typeof local.children === "function" ? null : renderChildren(local.children as JSX.Element);

  return (
    <View
      {...rest}
      ref={(node) => local.ref?.(node)}
      class={`${slots.header()} ${local.className ?? ""}`}
    >
      {child}
    </View>
  );
}
