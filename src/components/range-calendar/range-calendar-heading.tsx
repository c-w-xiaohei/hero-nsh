import type { JSX, ViewProps, ViewRef } from "nsh";
import { split, View } from "nsh";
import type { DateDuration } from "@internationalized/date";

import { renderChildren } from "../calendar/children";
import type { CalendarHeadingFormatOptions } from "../calendar/date-utils";
import { useRangeCalendarContext } from "./range-calendar-context";

export interface RangeCalendarHeadingProps extends Omit<ViewProps, "children" | "class" | "ref"> {
  /** Months (or the duration of the visible range) from its start. */
  offset?: DateDuration;

  /** Date format options for the heading. */
  format?: CalendarHeadingFormatOptions;

  children?: JSX.Element;
  className?: string;
  ref?: (node: ViewRef) => void;
}

/**
 * `RangeCalendar.Heading`: the visible range's localized title (R-010).
 *
 * STUB for the core phase (port sheet §6): the public props type is final, the
 * body is a placeholder. The real part renders a `Text role="header"` built by
 * `formatCalendarHeading` with `offset` / `format`.
 */
export function RangeCalendarHeading(props: RangeCalendarHeadingProps): JSX.Element {
  const { slots } = useRangeCalendarContext();
  const [local, rest] = split(props, ["offset", "format", "children", "className", "ref"]);
  const child = typeof local.children === "function" ? null : renderChildren(local.children as JSX.Element);

  return (
    <View
      {...rest}
      ref={(node) => local.ref?.(node)}
      class={`${slots.heading()} ${local.className ?? ""}`}
    >
      {child}
    </View>
  );
}
