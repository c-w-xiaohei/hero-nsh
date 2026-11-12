import type { JSX } from "nsh";

import { RangeCalendarCell } from "./range-calendar-cell";
import { RangeCalendarCellIndicator } from "./range-calendar-cell-indicator";
import { RangeCalendarGrid } from "./range-calendar-grid";
import { RangeCalendarGridBody } from "./range-calendar-grid-body";
import { RangeCalendarGridHeader } from "./range-calendar-grid-header";
import { RangeCalendarHeader } from "./range-calendar-header";
import { RangeCalendarHeaderCell } from "./range-calendar-header-cell";
import { RangeCalendarHeading } from "./range-calendar-heading";
import { RangeCalendarNavButton } from "./range-calendar-nav-button";
import { RangeCalendarRoot, type RangeCalendarRootProps } from "./range-calendar-root";
import {
  CalendarYearPickerCell,
  CalendarYearPickerGrid,
  CalendarYearPickerGridBody,
  CalendarYearPickerTrigger,
  CalendarYearPickerTriggerHeading,
  CalendarYearPickerTriggerIndicator,
} from "../calendar-year-picker";

import type { RangeCalendarCellProps } from "./range-calendar-cell";
import type { RangeCalendarCellIndicatorProps } from "./range-calendar-cell-indicator";
import type { RangeCalendarGridProps } from "./range-calendar-grid";
import type { RangeCalendarGridBodyProps } from "./range-calendar-grid-body";
import type { RangeCalendarGridHeaderProps } from "./range-calendar-grid-header";
import type { RangeCalendarHeaderProps } from "./range-calendar-header";
import type { RangeCalendarHeaderCellProps } from "./range-calendar-header-cell";
import type { RangeCalendarHeadingProps } from "./range-calendar-heading";
import type { RangeCalendarNavButtonProps } from "./range-calendar-nav-button";
import type { CalendarYearPickerCellProps } from "../calendar-year-picker";
import type { CalendarYearPickerGridBodyProps } from "../calendar-year-picker";
import type { CalendarYearPickerGridProps } from "../calendar-year-picker";
import type { CalendarYearPickerTriggerHeadingProps } from "../calendar-year-picker";
import type { CalendarYearPickerTriggerIndicatorProps } from "../calendar-year-picker";
import type { CalendarYearPickerTriggerProps } from "../calendar-year-picker";

export type RangeCalendarComponent = (props: RangeCalendarRootProps) => JSX.Element;

/**
 * `RangeCalendar` is HeroUI 3.2.7's compound: ten date parts plus the six year
 * picker parts, with the root reachable as `RangeCalendar.Root` and
 * `RangeCalendarRoot`. Every part is a real component.
 */
export const RangeCalendar = Object.assign(RangeCalendarRoot, {
  Root: RangeCalendarRoot,
  Header: RangeCalendarHeader,
  Heading: RangeCalendarHeading,
  NavButton: RangeCalendarNavButton,
  Grid: RangeCalendarGrid,
  GridHeader: RangeCalendarGridHeader,
  GridBody: RangeCalendarGridBody,
  HeaderCell: RangeCalendarHeaderCell,
  Cell: RangeCalendarCell,
  CellIndicator: RangeCalendarCellIndicator,
  YearPickerTrigger: CalendarYearPickerTrigger,
  YearPickerTriggerHeading: CalendarYearPickerTriggerHeading,
  YearPickerTriggerIndicator: CalendarYearPickerTriggerIndicator,
  YearPickerGrid: CalendarYearPickerGrid,
  YearPickerGridBody: CalendarYearPickerGridBody,
  YearPickerCell: CalendarYearPickerCell,
}) as RangeCalendarComponent & {
  Root: typeof RangeCalendarRoot;
  Header: typeof RangeCalendarHeader;
  Heading: typeof RangeCalendarHeading;
  NavButton: typeof RangeCalendarNavButton;
  Grid: typeof RangeCalendarGrid;
  GridHeader: typeof RangeCalendarGridHeader;
  GridBody: typeof RangeCalendarGridBody;
  HeaderCell: typeof RangeCalendarHeaderCell;
  Cell: typeof RangeCalendarCell;
  CellIndicator: typeof RangeCalendarCellIndicator;
  YearPickerTrigger: typeof CalendarYearPickerTrigger;
  YearPickerTriggerHeading: typeof CalendarYearPickerTriggerHeading;
  YearPickerTriggerIndicator: typeof CalendarYearPickerTriggerIndicator;
  YearPickerGrid: typeof CalendarYearPickerGrid;
  YearPickerGridBody: typeof CalendarYearPickerGridBody;
  YearPickerCell: typeof CalendarYearPickerCell;
};

export type RangeCalendar = {
  Props: RangeCalendarRootProps;
  RootProps: RangeCalendarRootProps;
  HeaderProps: RangeCalendarHeaderProps;
  HeadingProps: RangeCalendarHeadingProps;
  NavButtonProps: RangeCalendarNavButtonProps;
  GridProps: RangeCalendarGridProps;
  GridHeaderProps: RangeCalendarGridHeaderProps;
  GridBodyProps: RangeCalendarGridBodyProps;
  HeaderCellProps: RangeCalendarHeaderCellProps;
  CellProps: RangeCalendarCellProps;
  CellIndicatorProps: RangeCalendarCellIndicatorProps;
  YearPickerTriggerProps: CalendarYearPickerTriggerProps;
  YearPickerTriggerHeadingProps: CalendarYearPickerTriggerHeadingProps;
  YearPickerTriggerIndicatorProps: CalendarYearPickerTriggerIndicatorProps;
  YearPickerGridProps: CalendarYearPickerGridProps;
  YearPickerGridBodyProps: CalendarYearPickerGridBodyProps;
  YearPickerCellProps: CalendarYearPickerCellProps;
};

export {
  RangeCalendarRoot,
  RangeCalendarHeader,
  RangeCalendarHeading,
  RangeCalendarNavButton,
  RangeCalendarGrid,
  RangeCalendarGridHeader,
  RangeCalendarGridBody,
  RangeCalendarHeaderCell,
  RangeCalendarCell,
  RangeCalendarCellIndicator,
};

export type {
  RangeCalendarRootProps,
  RangeCalendarRootProps as RangeCalendarProps,
  RangeCalendarHeaderProps,
  RangeCalendarHeadingProps,
  RangeCalendarNavButtonProps,
  RangeCalendarGridProps,
  RangeCalendarGridHeaderProps,
  RangeCalendarGridBodyProps,
  RangeCalendarHeaderCellProps,
  RangeCalendarCellProps,
  RangeCalendarCellIndicatorProps,
};

export type {
  CreateRangeCalendarStateProps,
  RangeCalendarSelection,
  RangeCalendarSelectionAlignment,
  RangeCalendarState,
  RangeCalendarValue,
} from "./create-range-calendar-state";
export type {
  RangeCalendarCellContextValue,
  RangeCalendarContextValue,
  RangeCalendarGridContextValue,
  RangeCalendarRenderProps,
  RangeCalendarRowValue,
} from "./range-calendar-context";

/** The year picker's state API, as the calendar unit exports it: the parts are
 * shared, so the names are re-exported from the same modules. */
export { YearPickerContext, useYearPicker } from "../calendar/year-picker-context";
export type { YearPickerContextValue } from "../calendar/year-picker-context";
export { useCalendarOrRangeState } from "../calendar/calendar-context";

export { rangeCalendarVariants } from "./range-calendar.styles";
export type { RangeCalendarVariants } from "./range-calendar.styles";
