import type { JSX, ViewProps } from "nsh";
import { View } from "nsh";
import type { CalendarYearPickerVariants } from "../calendar-year-picker.styles";

export interface CalendarYearPickerGridProps extends Omit<ViewProps, "children" | "class">, CalendarYearPickerVariants {
  children?: JSX.Element;
  className?: string;
  format?: "numeric" | "2-digit";
  visibleYears?: number;
  onKeyDown?: (event: unknown) => void;
  ref?: (node: import("nsh").ViewRef) => void;
}
export function CalendarYearPickerGrid(props: CalendarYearPickerGridProps): JSX.Element {
  return <View>{props.children}</View>;
}
