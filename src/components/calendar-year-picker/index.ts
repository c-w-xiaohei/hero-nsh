import { CalendarYearPickerRoot } from "./calendar-year-picker-root";
import {
  CalendarYearPickerCell,
  CalendarYearPickerGrid,
  CalendarYearPickerGridBody,
  CalendarYearPickerTrigger,
  CalendarYearPickerTriggerHeading,
  CalendarYearPickerTriggerIndicator,
} from "./parts";

/** HeroUI-compatible compound namespace for the calendar year-picker parts. */
export const CalendarYearPicker = Object.assign(CalendarYearPickerRoot, {
  Root: CalendarYearPickerRoot,
  Trigger: CalendarYearPickerTrigger,
  TriggerHeading: CalendarYearPickerTriggerHeading,
  TriggerIndicator: CalendarYearPickerTriggerIndicator,
  Grid: CalendarYearPickerGrid,
  GridBody: CalendarYearPickerGridBody,
  Cell: CalendarYearPickerCell,
});

export type CalendarYearPicker = {
  Props: import("./calendar-year-picker-root").CalendarYearPickerRootProps;
  RootProps: import("./calendar-year-picker-root").CalendarYearPickerRootProps;
  TriggerProps: import("./parts/calendar-year-picker-trigger").CalendarYearPickerTriggerProps;
  TriggerHeadingProps: import("./parts/calendar-year-picker-trigger-heading").CalendarYearPickerTriggerHeadingProps;
  TriggerIndicatorProps: import("./parts/calendar-year-picker-trigger-indicator").CalendarYearPickerTriggerIndicatorProps;
  GridProps: import("./parts/calendar-year-picker-grid").CalendarYearPickerGridProps;
  GridBodyProps: import("./parts/calendar-year-picker-grid-body").CalendarYearPickerGridBodyProps;
  CellProps: import("./parts/calendar-year-picker-cell").CalendarYearPickerCellProps;
};

export { CalendarYearPickerRoot };
export type { CalendarYearPickerRootProps } from "./calendar-year-picker-root";
export {
  CalendarYearPickerCell,
  CalendarYearPickerGrid,
  CalendarYearPickerGridBody,
  CalendarYearPickerTrigger,
  CalendarYearPickerTriggerHeading,
  CalendarYearPickerTriggerIndicator,
};
export type {
  CalendarYearPickerCellProps,
  CalendarYearPickerCellRenderProps,
} from "./parts/calendar-year-picker-cell";
export type { CalendarYearPickerGridProps } from "./parts/calendar-year-picker-grid";
export type { CalendarYearPickerGridBodyProps } from "./parts/calendar-year-picker-grid-body";
export type {
  CalendarYearPickerTriggerHeadingProps,
} from "./parts/calendar-year-picker-trigger-heading";
export type {
  CalendarYearPickerTriggerIndicatorProps,
} from "./parts/calendar-year-picker-trigger-indicator";
export type {
  CalendarYearPickerTriggerProps,
  CalendarYearPickerTriggerRenderProps,
} from "./parts/calendar-year-picker-trigger";
export { YearPickerContext, useYearPicker } from "./year-picker-context";
export type { YearPickerContextValue } from "./year-picker-context";
export { useCalendarOrRangeState } from "./use-calendar-state";
export { calendarYearPickerVariants } from "./calendar-year-picker.styles";
export type { CalendarYearPickerVariants } from "./calendar-year-picker.styles";
