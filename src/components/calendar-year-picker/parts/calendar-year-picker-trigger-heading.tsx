import type { Accessor, JSX, ViewProps } from "nsh";
import { split, Text } from "nsh";
import type { CalendarYearPickerVariants } from "../calendar-year-picker.styles";
import { calendarYearPickerVariants } from "../calendar-year-picker.styles";
import type { CalendarYearPickerTriggerRenderProps } from "./calendar-year-picker-trigger";
import { useCalendarYearPickerTriggerContext } from "./calendar-year-picker-trigger-context";

export interface CalendarYearPickerTriggerHeadingProps extends Omit<ViewProps, "children" | "class">, CalendarYearPickerVariants {
  children?: JSX.Element | ((values: CalendarYearPickerTriggerRenderProps) => JSX.Element);
  className?: string;
  offset?: number;
  format?: "short" | "long";
}
export function CalendarYearPickerTriggerHeading(props: CalendarYearPickerTriggerHeadingProps): JSX.Element {
  const values = useCalendarYearPickerTriggerContext();
  const [local, rest] = split(props, ["children", "className", "offset", "format"]);
  const classes = calendarYearPickerVariants();
  const content = local.children;
  const children = typeof content === "function" ? content(values) : content ?? values.monthYear();
  return <Text {...rest} class={`${classes.triggerHeading()} ${local.className ?? ""}`}>{children}</Text>;
}
