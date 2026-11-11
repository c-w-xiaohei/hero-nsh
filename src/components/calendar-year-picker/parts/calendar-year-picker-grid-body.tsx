import type { Accessor, JSX } from "nsh";
import { View } from "nsh";
import type { CalendarYearPickerCellRenderProps } from "./calendar-year-picker-cell";

export interface CalendarYearPickerGridBodyProps {
  children?: (values: CalendarYearPickerCellRenderProps) => JSX.Element;
}
export function CalendarYearPickerGridBody(_props: CalendarYearPickerGridBodyProps): JSX.Element {
  return <View />;
}
