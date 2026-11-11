import type { Accessor, JSX, ViewProps } from "nsh";
import { View } from "nsh";
import type { CalendarYearPickerVariants } from "../calendar-year-picker.styles";
import type { CalendarYearPickerTriggerRenderProps } from "./calendar-year-picker-trigger";

export interface CalendarYearPickerTriggerHeadingProps extends Omit<ViewProps, "children" | "class">, CalendarYearPickerVariants {
  children?: JSX.Element | ((values: CalendarYearPickerTriggerRenderProps) => JSX.Element);
  className?: string;
  offset?: number;
  format?: "short" | "long";
}
export function CalendarYearPickerTriggerHeading(props: CalendarYearPickerTriggerHeadingProps): JSX.Element {
  return <View>{typeof props.children === "function" ? null : props.children}</View>;
}
