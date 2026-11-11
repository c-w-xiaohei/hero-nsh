import type { JSX, ViewProps, ViewRef } from "nsh";
import { split, Text } from "nsh";
import type { DateDuration } from "@internationalized/date";

import { useCalendarContext } from "./calendar-context";
import type { CalendarHeadingFormatOptions } from "./date-utils";
import { formatCalendarHeading } from "./date-utils";

export interface CalendarHeadingProps extends Omit<ViewProps, "children" | "class" | "ref"> {
  /** Months (or the duration of the visible range) from its start. */
  offset?: DateDuration;

  /** Date format options for the heading. */
  format?: CalendarHeadingFormatOptions;

  children?: JSX.Element;
  className?: string;
  ref?: (node: ViewRef) => void;
}

/**
 * `Calendar.Heading`: the visible range's localized title. Upstream renders an
 * `h2`; NSH has `Text role="header"` (port sheet §8).
 */
export function CalendarHeading(props: CalendarHeadingProps): JSX.Element {
  const { state, slots } = useCalendarContext();
  const [local, rest] = split(props, ["offset", "format", "children", "className", "ref"]);

  const heading = () =>
    formatCalendarHeading(state, { offset: local.offset, format: local.format });

  return (
    <Text
      {...rest}
      ref={(node) => local.ref?.(node)}
      role="header"
      accessibilityLevel={2}
      class={`${slots.heading()} ${local.className ?? ""}`}
    >
      {local.children ?? heading()}
    </Text>
  );
}
