import type { JSX, ViewProps, ViewRef } from "nsh";
import { split, Text } from "nsh";
import type { DateDuration } from "@internationalized/date";

import { renderChildren } from "../calendar/children";
import type { CalendarHeadingFormatOptions } from "../calendar/date-utils";
import { formatCalendarHeading } from "../calendar/date-utils";
import { useRangeCalendarContext } from "./range-calendar-context";

export interface RangeCalendarHeadingProps extends Omit<ViewProps, "children" | "class" | "ref"> {
  /** Months (or the duration of the visible range) from its start. */
  offset?: DateDuration;

  /** Date format options for the heading. */
  format?: CalendarHeadingFormatOptions;

  /** Heading level; upstream inherits 2 from the calendar's heading context. @default 2 */
  level?: number;

  children?: JSX.Element;
  className?: string;
  ref?: (node: ViewRef) => void;
}

/**
 * `RangeCalendar.Heading`: the visible range's localized title (R-010).
 *
 * `formatCalendarHeading` is React Aria's `useCalendarHeading` as a string
 * (`../calendar/date-utils`): the month and year of the visible range, or a
 * `formatRange` in a day/week view, with `offset` and `format` applied.
 * Upstream renders an `h2`; NSH has `Text role="header"` (port sheet §8).
 */
export function RangeCalendarHeading(props: RangeCalendarHeadingProps): JSX.Element {
  const { state, slots } = useRangeCalendarContext();
  const [local, rest] = split(props, [
    "offset",
    "format",
    "level",
    "children",
    "className",
    "ref",
  ]);

  const heading = () =>
    formatCalendarHeading(state, { offset: local.offset, format: local.format });

  return (
    <Text
      {...rest}
      ref={(node) => local.ref?.(node)}
      role="header"
      accessibilityLevel={local.level ?? 2}
      class={`${slots.heading()} ${local.className ?? ""}`}
    >
      {local.children != null ? renderChildren(local.children) : heading()}
    </Text>
  );
}
