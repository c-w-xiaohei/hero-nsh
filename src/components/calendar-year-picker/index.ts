import {
  CalendarYearPickerCell,
  CalendarYearPickerGrid,
  CalendarYearPickerGridBody,
  CalendarYearPickerTrigger,
  CalendarYearPickerTriggerHeading,
  CalendarYearPickerTriggerIndicator,
} from "./parts";

import type { CalendarYearPickerCellProps } from "./parts/calendar-year-picker-cell";
import type { CalendarYearPickerGridBodyProps } from "./parts/calendar-year-picker-grid-body";
import type { CalendarYearPickerGridProps } from "./parts/calendar-year-picker-grid";
import type { CalendarYearPickerTriggerHeadingProps } from "./parts/calendar-year-picker-trigger-heading";
import type { CalendarYearPickerTriggerIndicatorProps } from "./parts/calendar-year-picker-trigger-indicator";
import type { CalendarYearPickerTriggerProps } from "./parts/calendar-year-picker-trigger";

/**
 * `CalendarYearPicker` is HeroUI 3.2.7's parts-only compound: six parts and no
 * `Root`, because the panel opens from the calendar root's state (port sheet
 * §1.1).
 */
export const CalendarYearPicker = {
  Trigger: CalendarYearPickerTrigger,
  TriggerHeading: CalendarYearPickerTriggerHeading,
  TriggerIndicator: CalendarYearPickerTriggerIndicator,
  Grid: CalendarYearPickerGrid,
  GridBody: CalendarYearPickerGridBody,
  Cell: CalendarYearPickerCell,
};

export type CalendarYearPicker = {
  TriggerProps: CalendarYearPickerTriggerProps;
  TriggerHeadingProps: CalendarYearPickerTriggerHeadingProps;
  TriggerIndicatorProps: CalendarYearPickerTriggerIndicatorProps;
  GridProps: CalendarYearPickerGridProps;
  GridBodyProps: CalendarYearPickerGridBodyProps;
  CellProps: CalendarYearPickerCellProps;
};

export {
  CalendarYearPickerTrigger,
  CalendarYearPickerTriggerHeading,
  CalendarYearPickerTriggerIndicator,
  CalendarYearPickerGrid,
  CalendarYearPickerGridBody,
  CalendarYearPickerCell,
};

export type {
  CalendarYearPickerTriggerProps,
  CalendarYearPickerTriggerRenderProps,
} from "./parts/calendar-year-picker-trigger";
export type { CalendarYearPickerTriggerHeadingProps } from "./parts/calendar-year-picker-trigger-heading";
export type { CalendarYearPickerTriggerIndicatorProps } from "./parts/calendar-year-picker-trigger-indicator";
export type {
  CalendarYearPickerCellRenderProps,
  CalendarYearPickerFormatOptions,
  CalendarYearPickerGridProps,
} from "./parts/calendar-year-picker-grid";
export type { CalendarYearPickerGridBodyProps } from "./parts/calendar-year-picker-grid-body";
export type { CalendarYearPickerCellProps } from "./parts/calendar-year-picker-cell";

export { YearPickerContext, useYearPicker } from "./year-picker-context";
export type { YearPickerContextValue } from "./year-picker-context";
export { useCalendarOrRangeState } from "./use-calendar-state";

export { calendarYearPickerVariants } from "./calendar-year-picker.styles";
export type { CalendarYearPickerVariants } from "./calendar-year-picker.styles";
