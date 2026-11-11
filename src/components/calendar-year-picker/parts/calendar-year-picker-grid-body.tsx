import type { JSX } from "nsh";

import { CalendarYearPickerCell } from "./calendar-year-picker-cell";
import type { CalendarYearPickerCellRenderProps } from "./calendar-year-picker-grid";
import { useCalendarYearPickerGridContext } from "./calendar-year-picker-grid";

export interface CalendarYearPickerGridBodyProps {
  /** One element per year; the default is a `CalendarYearPickerCell`. */
  children?: (values: CalendarYearPickerCellRenderProps) => JSX.Element;
}

/** `Calendar.YearPickerGridBody`: every year of the window, in order. */
export function CalendarYearPickerGridBody(props: CalendarYearPickerGridBodyProps): JSX.Element {
  const grid = useCalendarYearPickerGridContext();

  return (
    <Each of={grid.years()} key="index">
      {(year) => {
        const value = year();
        const values: CalendarYearPickerCellRenderProps = {
          year: () => value,
          formattedYear: () => grid.formattedYear(value),
          isSelected: () => grid.isSelected(value),
          isCurrentYear: () => value === grid.currentYear(),
          isOpen: grid.isOpen,
          selectYear: () => grid.selectYear(value),
        };
        return props.children ? props.children(values) : <CalendarYearPickerCell year={value} />;
      }}
    </Each>
  );
}
