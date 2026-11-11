import type { JSX, ViewProps } from "nsh";
import { View } from "nsh";
import type { CalendarYearPickerVariants } from "../calendar-year-picker.styles";
import type { CalendarYearPickerTriggerRenderProps } from "./calendar-year-picker-trigger";

export interface CalendarYearPickerTriggerIndicatorProps extends Omit<ViewProps, "children" | "class">, CalendarYearPickerVariants {
  children?: JSX.Element | ((values: CalendarYearPickerTriggerRenderProps) => JSX.Element);
  className?: string;
}
export function CalendarYearPickerTriggerIndicator(props: CalendarYearPickerTriggerIndicatorProps): JSX.Element {
  return <View>{typeof props.children === "function" ? null : props.children}</View>;
}
