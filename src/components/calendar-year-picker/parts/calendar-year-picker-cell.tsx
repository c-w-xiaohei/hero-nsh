import type { Accessor, JSX, PressEvent, ViewProps } from "nsh";
import { View } from "nsh";
import type { CalendarYearPickerVariants } from "../calendar-year-picker.styles";

export interface CalendarYearPickerCellRenderProps {
  year: Accessor<number>;
  formattedYear: Accessor<string>;
  isSelected: Accessor<boolean>;
  isCurrentYear: Accessor<boolean>;
  isOpen: Accessor<boolean>;
  selectYear: () => void;
}
export interface CalendarYearPickerCellProps extends Omit<ViewProps, "children" | "class" | "onPress">, CalendarYearPickerVariants {
  year: number;
  children?: JSX.Element | ((values: CalendarYearPickerCellRenderProps) => JSX.Element);
  excludeFromTabOrder?: boolean;
  onFocus?: () => void;
  onPress?: (event: PressEvent) => void;
  ref?: (node: import("nsh").ViewRef) => void;
}
export function CalendarYearPickerCell(props: CalendarYearPickerCellProps): JSX.Element {
  return <View>{typeof props.children === "function" ? null : props.children}</View>;
}
