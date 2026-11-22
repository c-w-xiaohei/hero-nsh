import type { Accessor, Bounds, Edges, Point, Size } from "nsh";
import { context } from "nsh";
import type { Calendar, CalendarDate, CalendarIdentifier, DateValue } from "@internationalized/date";

import type { calendarVariants } from "./calendar.styles";
import type { CalendarState } from "./create-calendar-state";
import type { CalendarOrRangeState } from "./date-utils";

/** Which page button registered: `slot` of `CalendarNavButtonProps`. */
export type CalendarNavSlot = "previous" | "next";

/**
 * The touch-gated `createPressFeedback` channels a Cell or NavButton runs
 * (adapt sheet A-003/A-004), seen as read channels only — the part's `View`
 * owns the writers. `hitSlop` is a view prop `nsh/test` cannot read and a
 * seam `isPressed` has no style of its own, so these accessors are the seam's
 * only observable surface (sheet §6's hitSlop registration); they sit on the
 * context exactly as `CheckboxFeedbackChannels` does. Under the default
 * pointer environment every channel rests: `isPressed` false, `hitSlop`
 * `undefined`, `enabled` false.
 */
export interface CalendarFeedbackChannels {
  /** The seam's press flag; rises only while `enabled` holds. */
  isPressed: Accessor<boolean>;

  /** The part's measured size, from `onLayout`. */
  bounds: Accessor<Size>;

  /** Where the current press went down; null while the seam is gated off. */
  pressOrigin: Accessor<Point | null>;

  /** The slop the seam binds on the part's `hitSlop`; `undefined` under pointer. */
  hitSlop: Accessor<number | Partial<Edges> | undefined>;

  /** The seam's effective gate (`input() === "touch"` plus the part's own blockers). */
  enabled: Accessor<boolean>;
}

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

  /**
   * A-003: the NavButton press-feedback channels by slot — `hitSlop`
   * included, the only way a test observes the computed slop. `undefined`
   * while no button of that slot has mounted.
   */
  navButtonHitSlop: Accessor<
    Partial<Record<CalendarNavSlot, CalendarFeedbackChannels>>
  >;

  /**
   * A-004: each mounted Cell's press-feedback channels, keyed by
   * `date.toString()`, so a test can sample the gated `isPressed` and
   * `enabled` of the exact cell it pressed.
   */
  cellFeedback: Accessor<ReadonlyMap<string, CalendarFeedbackChannels>>;

  /** A NavButton registers its channels on mount and clears them on cleanup. */
  setNavButtonFeedback: (
    slot: CalendarNavSlot,
    channels: CalendarFeedbackChannels | undefined,
  ) => void;

  /** A Cell registers its channels under its date key, cleared on cleanup. */
  setCellFeedback: (
    dateKey: string,
    channels: CalendarFeedbackChannels | undefined,
  ) => void;
}

export const CalendarContext = context<CalendarContextValue | undefined>(undefined);

export function useCalendarContext(): CalendarContextValue {
  const value = CalendarContext();
  if (!value) {
    throw new Error("Calendar components must be used within a <Calendar> component.");
  }
  return value;
}

/**
 * The date state the year-picker parts read, supplied by either root
 * (range-calendar port sheet §5). A `RangeCalendar` provides this context
 * because its state is not a `CalendarState`; `Calendar` provides nothing new
 * and falls back to its own context, so its behaviour is unchanged.
 */
export const CalendarOrRangeStateContext = context<CalendarOrRangeState | undefined>(undefined);

/** The active Calendar or RangeCalendar state, as HeroUI's `useCalendarOrRangeState` returns it. */
export function useCalendarOrRangeState(): CalendarOrRangeState {
  const rangeState = CalendarOrRangeStateContext();
  if (rangeState) return rangeState;
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

  /**
   * Range mode only: reports whether this calendar is between the two presses
   * of a range (React Stately's `anchorDate` is set), so an enclosing
   * DateRangePicker closes its layer on the press that completes the range
   * rather than on the first one. Returns the unregister function
   * (date-range-picker port sheet §5, second cross-unit change).
   */
  registerSelectionInProgress?: (isSelecting: Accessor<boolean>) => () => void;

  /**
   * Range mode only: whether a selected range may hold dates the user cannot
   * pick. React Aria's `calendarProps` carries it from `DateRangePicker`
   * (date-range-picker port sheet §2, derived values).
   */
  allowsNonContiguousRanges?: Accessor<boolean | undefined>;
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
