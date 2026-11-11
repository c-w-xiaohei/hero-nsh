import type { JSX, ViewProps, ViewRef } from "nsh";
import { split, Text } from "nsh";

import { renderChildren } from "../../calendar/children";
import type { DateDuration } from "@internationalized/date";

import { useCalendarOrRangeState } from "../../calendar/calendar-context";
import type { CalendarHeadingFormatOptions } from "../../calendar/date-utils";
import { formatCalendarHeading } from "../../calendar/date-utils";
import { calendarYearPickerVariants } from "../calendar-year-picker.styles";
import type { CalendarYearPickerTriggerRenderProps } from "./calendar-year-picker-trigger";
import { useCalendarYearPickerTriggerContext } from "./calendar-year-picker-trigger-context";

export interface CalendarYearPickerTriggerHeadingProps
  extends Omit<ViewProps, "children" | "class" | "ref"> {
  children?: JSX.Element | ((values: CalendarYearPickerTriggerRenderProps) => JSX.Element);
  className?: string;
  /** Months from the visible range's start. */
  offset?: DateDuration;
  /** Date format options for the heading. */
  format?: CalendarHeadingFormatOptions;
  ref?: (node: ViewRef) => void;
}

/** `Calendar.YearPickerTriggerHeading`: the label inside the trigger. */
export function CalendarYearPickerTriggerHeading(
  props: CalendarYearPickerTriggerHeadingProps,
): JSX.Element {
  const values = useCalendarYearPickerTriggerContext();
  const state = useCalendarOrRangeState();
  const [local, rest] = split(props, ["children", "className", "offset", "format", "ref"]);
  const slots = calendarYearPickerVariants();

  const heading = () => formatCalendarHeading(state, { offset: local.offset, format: local.format });
  const child =
    typeof local.children === "function"
      ? local.children(values)
      : renderChildren(local.children ?? heading());

  return (
    <Text
      {...rest}
      ref={(node) => local.ref?.(node)}
      class={`${slots.triggerHeading()} ${
        // R-054: an open panel tints the heading.
        values.isOpen() ? "text-accent-soft-foreground" : ""
      } ${local.className ?? ""}`}
    >
      {child}
    </Text>
  );
}
