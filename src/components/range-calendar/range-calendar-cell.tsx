import type { JSX, MouseEvent as NshMouseEvent, PressEvent, ViewProps, ViewRef } from "nsh";
import { split, View } from "nsh";
import type { CalendarDate } from "@internationalized/date";

import { renderChildren } from "../calendar/children";
import type { CalendarCellRenderProps } from "../calendar/calendar-context";
import { useRangeCalendarContext } from "./range-calendar-context";

export interface RangeCalendarCellProps
  extends Omit<ViewProps, "children" | "class" | "onPress" | "ref"> {
  /** The date this cell shows; required. */
  date: CalendarDate;

  /** Nodes, or a function called once with the cell's state accessors (the
   * same 15 fields as `Calendar.Cell`). */
  children?: JSX.Element | ((values: CalendarCellRenderProps) => JSX.Element);

  className?: string;

  /** Keeps this cell out of the Tab order (roving focus uses it). */
  excludeFromTabOrder?: boolean;

  onPress?: (event: PressEvent) => void;
  onHoverStart?: (event: NshMouseEvent) => void;
  onHoverEnd?: (event: NshMouseEvent) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  ref?: (node: ViewRef) => void;
}

/**
 * `RangeCalendar.Cell`: one day — `td[role=cell]` > the focusable track
 * (`div.range-calendar__cell`) > the round button (`.range-calendar__cell-button`)
 * > the content (port sheet §3).
 *
 * STUB for the core phase (port sheet §6): the public props type is final, the
 * body is a placeholder. The real part owns R-020 and R-025…R-048 (track
 * rounding and breaks from `RangeCalendarRowContext`, the caps, the focus ring
 * on the round button), and provides `RangeCalendarCellContext` for the
 * indicator (R-050).
 */
export function RangeCalendarCell(props: RangeCalendarCellProps): JSX.Element {
  const { slots } = useRangeCalendarContext();
  const [local, rest] = split(props, [
    "date",
    "children",
    "className",
    "excludeFromTabOrder",
    "onPress",
    "onHoverStart",
    "onHoverEnd",
    "onFocus",
    "onBlur",
    "ref",
  ]);
  const child = typeof local.children === "function" ? null : renderChildren(local.children as JSX.Element);

  return (
    <View {...rest} ref={(node) => local.ref?.(node)} class={`w-full ${local.className ?? ""}`}>
      <View class={slots.cell()}>{child}</View>
    </View>
  );
}
