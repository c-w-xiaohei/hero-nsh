import { context } from "nsh";
import type { Accessor, ViewRef } from "nsh";

/** State Calendar and RangeCalendar provide to their year-picker parts. */
export interface YearPickerContextValue {
  isYearPickerOpen: Accessor<boolean>;
  setIsYearPickerOpen: (open: boolean) => void;
  calendarRef?: (node: ViewRef) => void;
  calendarGridSlot: "calendar-grid" | "range-calendar-grid";
}

/** Context supplied by Calendar / RangeCalendar; unavailable outside either root. */
export const YearPickerContext = context<YearPickerContextValue | undefined>(undefined);

export function useYearPicker(): YearPickerContextValue {
  const value = YearPickerContext();
  if (!value) {
    throw new Error("useYearPicker must be used within a <Calendar> or <RangeCalendar> component.");
  }
  return value;
}
