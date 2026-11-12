import type { Accessor, Bounds } from "nsh";
import { context } from "nsh";
import type { Calendar, CalendarDate, CalendarIdentifier, DateValue } from "@internationalized/date";

import type { calendarVariants } from "./calendar.styles";
import type { CalendarState } from "./create-calendar-state";

/** Everything a calendar part reads from its root. */
export interface CalendarContextValue {
  state: CalendarState;
  slots: ReturnType<typeof calendarVariants>;
  /** The root's accessible name (`aria-label` upstream). */
  ariaLabel: Accessor<string | undefined>;
  /** Reading direction, from the locale; keyboard arrows follow it. */
  direction: Accessor<"ltr" | "rtl">;
  /** True while a YearPicker panel is open; the Header hides its nav buttons. */
  isYearPickerOpen: Accessor<boolean>;
}

export const CalendarContext = context<CalendarContextValue | undefined>(undefined);

export function useCalendarContext(): CalendarContextValue {
  const value = CalendarContext();
  if (!value) {
    throw new Error("Calendar components must be used within a <Calendar> component.");
  }
  return value;
}

/** The active Calendar state, as HeroUI's `useCalendarOrRangeState` returns it. */
export function useCalendarOrRangeState(): CalendarState {
  return useCalendarContext().state;
}

/** One date grid's derived collection. */
export interface CalendarGridContextValue {
  /** The first date this grid shows (visible range start + `offset`). */
  startDate: Accessor<CalendarDate>;
  /** Weekday labels, seven of them (fewer only in a day view under seven days). */
  weekDays: Accessor<readonly string[]>;
  /** Week-aligned date rows; `null` is a padding slot. */
  rows: Accessor<readonly (readonly (CalendarDate | null)[])[]>;
  /** The grid's accessible name: root label + visible-range description. */
  gridLabel: Accessor<string>;
  /** True in a day view under seven days. */
  isNarrowDayView: Accessor<boolean>;
  /** The focus entered a cell: the grid owns the keyboard. */
  onCellFocus: (date: CalendarDate) => void;
  /** The focus left a cell; cleared unless another cell takes it this turn. */
  onCellBlur: () => void;
}

export const CalendarGridContext = context<CalendarGridContextValue | undefined>(undefined);

export function useCalendarGridContext(): CalendarGridContextValue {
  const value = CalendarGridContext();
  if (!value) {
    throw new Error("Calendar grid parts must be used within a <Calendar.Grid> component.");
  }
  return value;
}

/** The date grid's frame inside the calendar root, for the year panel overlay. */
export interface CalendarGridLayoutValue {
  bounds: Accessor<Bounds | undefined>;
  setBounds: (bounds: Bounds) => void;
}

export const CalendarGridLayoutContext = context<CalendarGridLayoutValue | undefined>(undefined);

/** The selected state a `Calendar.Cell` hands its indicator. */
export interface CalendarCellContextValue {
  isSelected: Accessor<boolean>;
}

export const CalendarCellContext = context<CalendarCellContextValue | undefined>(undefined);

/** The render-prop values a `Calendar` root's function child receives (D17). */
export interface CalendarRenderProps {
  state: CalendarState;
  isDisabled: Accessor<boolean>;
  isInvalid: Accessor<boolean>;
}

/**
 * What an enclosing component (DatePicker, DateRangePicker) hands the
 * `Calendar` roots under it: React Aria's `calendarProps` from `useDatePicker`
 * (`react-aria-components/src/DatePicker.tsx:205-222`, merged into the
 * calendar's own props by `useContextProps` at `Calendar.tsx:180-186`).
 *
 * A calendar root that reads it uses each field only where its own prop is
 * `undefined`: the explicit prop wins, as `useContextProps` rules. Not
 * providing the context keeps a standalone `Calendar` behaving exactly as
 * before (port sheet §5, first cross-unit change).
 */
export interface CalendarDefaultsValue {
  /** The enclosing picker's value. */
  value?: Accessor<DateValue | DateValue[] | null | undefined>;

  /** The enclosing picker's change handler. */
  onChange?: (value: DateValue | DateValue[] | null) => void;

  /** The date the calendar opens on when it has no value. */
  defaultFocusedValue?: Accessor<DateValue | null | undefined>;

  /** The enclosing picker's bounds and availability. */
  minValue?: Accessor<DateValue | null | undefined>;
  maxValue?: Accessor<DateValue | null | undefined>;
  isDateUnavailable?: Accessor<((date: DateValue) => boolean) | undefined>;

  /** The enclosing picker's flags. */
  isDisabled?: Accessor<boolean | undefined>;
  isReadOnly?: Accessor<boolean | undefined>;
  autoFocus?: Accessor<boolean | undefined>;

  /** The calendar factory the enclosing picker was given. */
  createCalendar?: Accessor<
    ((name: CalendarIdentifier) => Calendar) | undefined
  >;

  /**
   * Extra classes for the nav buttons' chevrons, appended after the icon slot
   * class. A picker's layer carries `.date-picker__popover
   * .calendar__nav-button-icon { rotate: 0 }` upstream; a descendant selector
   * has no NSH counterpart, so the class travels through here instead
   * (port sheet R-028 / R-029).
   */
  navButtonIconClass?: Accessor<string | undefined>;
}

export const CalendarDefaultsContext = context<CalendarDefaultsValue | undefined>(undefined);

/** The value a cell's render function receives (HeroUI's 15-field shape). */
export interface CalendarCellRenderProps {
  date: CalendarDate;
  formattedDate: string;
  isHovered: Accessor<boolean>;
  isPressed: Accessor<boolean>;
  isSelected: Accessor<boolean>;
  isSelectionStart: Accessor<boolean>;
  isSelectionEnd: Accessor<boolean>;
  isFocused: Accessor<boolean>;
  isFocusVisible: Accessor<boolean>;
  isDisabled: Accessor<boolean>;
  isOutsideVisibleRange: Accessor<boolean>;
  isOutsideMonth: Accessor<boolean>;
  isUnavailable: Accessor<boolean>;
  isInvalid: Accessor<boolean>;
  isToday: Accessor<boolean>;
}
