import { context } from "nsh";
import type { CalendarYearPickerTriggerRenderProps } from "./calendar-year-picker-trigger";

export const CalendarYearPickerTriggerContext = context<CalendarYearPickerTriggerRenderProps | undefined>(undefined);

export function useCalendarYearPickerTriggerContext(): CalendarYearPickerTriggerRenderProps {
  const value = CalendarYearPickerTriggerContext();
  if (!value) throw new Error("CalendarYearPicker trigger parts must be used within <CalendarYearPicker.Trigger>.");
  return value;
}
