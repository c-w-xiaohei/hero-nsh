import type { JSX, ViewProps } from "nsh";
import { split, View } from "nsh";
import { IconChevronRight } from "../../../icons";
import type { CalendarYearPickerVariants } from "../calendar-year-picker.styles";
import { calendarYearPickerVariants } from "../calendar-year-picker.styles";
import type { CalendarYearPickerTriggerRenderProps } from "./calendar-year-picker-trigger";
import { useCalendarYearPickerTriggerContext } from "./calendar-year-picker-trigger-context";

export interface CalendarYearPickerTriggerIndicatorProps extends Omit<ViewProps, "children" | "class">, CalendarYearPickerVariants {
  children?: JSX.Element | ((values: CalendarYearPickerTriggerRenderProps) => JSX.Element);
  className?: string;
}
export function CalendarYearPickerTriggerIndicator(props: CalendarYearPickerTriggerIndicatorProps): JSX.Element {
  const values = useCalendarYearPickerTriggerContext();
  const [local, rest] = split(props, ["children", "className"]);
  const classes = calendarYearPickerVariants();
  const content = local.children;
  const children = typeof content === "function" ? content(values) : content ?? <IconChevronRight />;
  return <View {...rest} class={`${classes.triggerIndicator()} ${local.className ?? ""}`} accessibilityElementsHidden>{children}</View>;
}
