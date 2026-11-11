import type { Accessor, JSX, PressEvent, ViewProps } from "nsh";
import { View } from "nsh";
import type { CalendarYearPickerVariants } from "../calendar-year-picker.styles";

export interface CalendarYearPickerTriggerRenderProps {
  isOpen: Accessor<boolean>;
  monthYear: Accessor<string>;
  toggle: () => void;
}
export interface CalendarYearPickerTriggerProps extends Omit<ViewProps, "children" | "class" | "onPress">, CalendarYearPickerVariants {
  children: JSX.Element | ((values: CalendarYearPickerTriggerRenderProps) => JSX.Element);
  className?: string;
  onPress?: (event: PressEvent) => void;
  onKeyDown?: (event: unknown) => void;
  ref?: (node: import("nsh").ViewRef) => void;
}
export function CalendarYearPickerTrigger(props: CalendarYearPickerTriggerProps): JSX.Element {
  return <View>{typeof props.children === "function" ? null : props.children}</View>;
}
