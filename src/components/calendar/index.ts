import type { JSX } from "nsh";

import { CalendarCell } from "./calendar-cell";
import { CalendarCellIndicator } from "./calendar-cell-indicator";
import { CalendarGrid } from "./calendar-grid";
import { CalendarGridBody } from "./calendar-grid-body";
import { CalendarGridHeader } from "./calendar-grid-header";
import { CalendarHeader } from "./calendar-header";
import { CalendarHeaderCell } from "./calendar-header-cell";
import { CalendarHeading } from "./calendar-heading";
import { CalendarNavButton } from "./calendar-nav-button";
import { CalendarRoot, type CalendarRootProps } from "./calendar-root";
import {
  CalendarYearPickerCell,
  CalendarYearPickerGrid,
  CalendarYearPickerGridBody,
  CalendarYearPickerTrigger,
  CalendarYearPickerTriggerHeading,
  CalendarYearPickerTriggerIndicator,
} from "../calendar-year-picker";

import type { CalendarCellProps } from "./calendar-cell";
import type { CalendarCellIndicatorProps } from "./calendar-cell-indicator";
import type { CalendarGridProps } from "./calendar-grid";
import type { CalendarGridBodyProps } from "./calendar-grid-body";
import type { CalendarGridHeaderProps } from "./calendar-grid-header";
import type { CalendarHeaderProps } from "./calendar-header";
import type { CalendarHeaderCellProps } from "./calendar-header-cell";
import type { CalendarHeadingProps } from "./calendar-heading";
import type { CalendarNavButtonProps } from "./calendar-nav-button";
import type { CalendarYearPickerCellProps } from "../calendar-year-picker";
import type { CalendarYearPickerGridBodyProps } from "../calendar-year-picker";
import type { CalendarYearPickerGridProps } from "../calendar-year-picker";
import type { CalendarYearPickerTriggerHeadingProps } from "../calendar-year-picker";
import type { CalendarYearPickerTriggerIndicatorProps } from "../calendar-year-picker";
import type { CalendarYearPickerTriggerProps } from "../calendar-year-picker";

export type CalendarComponent = (props: CalendarRootProps) => JSX.Element;

/**
 * `Calendar` is HeroUI 3.2.7's compound: ten date parts plus the six year
 * picker parts, with the root reachable as `Calendar.Root` and `CalendarRoot`.
 */
export const Calendar = Object.assign(CalendarRoot, {
  Root: CalendarRoot,
  Header: CalendarHeader,
  Heading: CalendarHeading,
  NavButton: CalendarNavButton,
  Grid: CalendarGrid,
  GridHeader: CalendarGridHeader,
  GridBody: CalendarGridBody,
  HeaderCell: CalendarHeaderCell,
  Cell: CalendarCell,
  CellIndicator: CalendarCellIndicator,
  YearPickerTrigger: CalendarYearPickerTrigger,
  YearPickerTriggerHeading: CalendarYearPickerTriggerHeading,
  YearPickerTriggerIndicator: CalendarYearPickerTriggerIndicator,
  YearPickerGrid: CalendarYearPickerGrid,
  YearPickerGridBody: CalendarYearPickerGridBody,
  YearPickerCell: CalendarYearPickerCell,
}) as CalendarComponent & {
  Root: typeof CalendarRoot;
  Header: typeof CalendarHeader;
  Heading: typeof CalendarHeading;
  NavButton: typeof CalendarNavButton;
  Grid: typeof CalendarGrid;
  GridHeader: typeof CalendarGridHeader;
  GridBody: typeof CalendarGridBody;
  HeaderCell: typeof CalendarHeaderCell;
  Cell: typeof CalendarCell;
  CellIndicator: typeof CalendarCellIndicator;
  YearPickerTrigger: typeof CalendarYearPickerTrigger;
  YearPickerTriggerHeading: typeof CalendarYearPickerTriggerHeading;
  YearPickerTriggerIndicator: typeof CalendarYearPickerTriggerIndicator;
  YearPickerGrid: typeof CalendarYearPickerGrid;
  YearPickerGridBody: typeof CalendarYearPickerGridBody;
  YearPickerCell: typeof CalendarYearPickerCell;
};

export type Calendar = {
  Props: CalendarRootProps;
  RootProps: CalendarRootProps;
  HeaderProps: CalendarHeaderProps;
  HeadingProps: CalendarHeadingProps;
  NavButtonProps: CalendarNavButtonProps;
  GridProps: CalendarGridProps;
  GridHeaderProps: CalendarGridHeaderProps;
  GridBodyProps: CalendarGridBodyProps;
  HeaderCellProps: CalendarHeaderCellProps;
  CellProps: CalendarCellProps;
  CellIndicatorProps: CalendarCellIndicatorProps;
  YearPickerTriggerProps: CalendarYearPickerTriggerProps;
  YearPickerTriggerHeadingProps: CalendarYearPickerTriggerHeadingProps;
  YearPickerTriggerIndicatorProps: CalendarYearPickerTriggerIndicatorProps;
  YearPickerGridProps: CalendarYearPickerGridProps;
  YearPickerGridBodyProps: CalendarYearPickerGridBodyProps;
  YearPickerCellProps: CalendarYearPickerCellProps;
};

export {
  CalendarRoot,
  CalendarHeader,
  CalendarHeading,
  CalendarNavButton,
  CalendarGrid,
  CalendarGridHeader,
  CalendarGridBody,
  CalendarHeaderCell,
  CalendarCell,
  CalendarCellIndicator,
};

export type {
  CalendarRootProps,
  CalendarRootProps as CalendarProps,
  CalendarHeaderProps,
  CalendarHeadingProps,
  CalendarNavButtonProps,
  CalendarGridProps,
  CalendarGridHeaderProps,
  CalendarGridBodyProps,
  CalendarHeaderCellProps,
  CalendarCellProps,
  CalendarCellIndicatorProps,
};

export type { CalendarSelectionMode } from "./create-calendar-state";
export type { CalendarRenderProps, CalendarCellRenderProps } from "./calendar-context";
export type { CalendarState } from "./create-calendar-state";
export type { CalendarOrRangeState } from "./date-utils";

/** The year picker's state API is exported here as well, as upstream does. */
export { YearPickerContext, useYearPicker } from "./year-picker-context";
export type { YearPickerContextValue } from "./year-picker-context";
export { useCalendarOrRangeState } from "./calendar-context";
export type { YearPickerContextValue as CalendarYearPickerContextValue } from "./year-picker-context";

export { calendarVariants } from "./calendar.styles";
export type { CalendarVariants } from "./calendar.styles";
