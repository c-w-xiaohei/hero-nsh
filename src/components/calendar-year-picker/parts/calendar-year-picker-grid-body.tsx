import type { JSX } from "nsh";
import { View } from "nsh";
import { YearGridContext } from "./calendar-year-picker-grid";
import { CalendarYearPickerCell } from "./calendar-year-picker-cell";
import type { CalendarYearPickerCellRenderProps } from "./calendar-year-picker-cell";

export interface CalendarYearPickerGridBodyProps {
  children?: (values: CalendarYearPickerCellRenderProps) => JSX.Element;
}

export function CalendarYearPickerGridBody(props: CalendarYearPickerGridBodyProps): JSX.Element {
  const grid = YearGridContext();
  if (!grid) throw new Error("CalendarYearPickerGridBody must be used inside CalendarYearPickerGrid.");
  return (
    <View>
      {grid.years().map((year) => {
        const values = grid.yearData(year);
        return props.children ? props.children(values) : <CalendarYearPickerCell year={year} />;
      })}
    </View>
  );
}
