import type { Accessor, Edges, Point, Size } from "nsh";
import { context } from "nsh";
import type { CalendarDate } from "@internationalized/date";

import type { rangeCalendarVariants } from "./range-calendar.styles";
import type { RangeCalendarState } from "./create-range-calendar-state";

/** Which page button registered: `slot` of `RangeCalendarNavButtonProps`. */
export type RangeCalendarNavSlot = "previous" | "next";

/**
 * The touch-gated `createPressFeedback` channels a Cell or NavButton runs
 * (adapt sheet A-003/A-004), seen as read channels only — the part's `View`
 * owns the writers. `hitSlop` is a view prop `nsh/test` cannot read and a
 * seam `isPressed` has no style of its own, so these accessors are the
 * seam's only observable surface (sheet §6's hitSlop registration); they sit
 * on the context exactly as `CheckboxFeedbackChannels` does. Under the
 * default pointer environment every channel rests: `isPressed` false,
 * `hitSlop` `undefined`, `enabled` false.
 */
export interface RangeCalendarFeedbackChannels {
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

/** Everything a range-calendar part reads from its root. */
export interface RangeCalendarContextValue {
  state: RangeCalendarState;
  slots: ReturnType<typeof rangeCalendarVariants>;
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
  navButtonFeedback: Accessor<
    Partial<Record<RangeCalendarNavSlot, RangeCalendarFeedbackChannels>>
  >;

  /**
   * A-004: each mounted Cell's press-feedback channels, keyed by
   * `date.toString()`, so a test can sample the gated `isPressed` and
   * `enabled` of the exact cell it pressed.
   */
  cellFeedback: Accessor<ReadonlyMap<string, RangeCalendarFeedbackChannels>>;

  /** A NavButton registers its channels on mount and clears them on cleanup. */
  setNavButtonFeedback: (
    slot: RangeCalendarNavSlot,
    channels: RangeCalendarFeedbackChannels | undefined,
  ) => void;

  /** A Cell registers its channels under its date key, cleared on cleanup. */
  setCellFeedback: (
    dateKey: string,
    channels: RangeCalendarFeedbackChannels | undefined,
  ) => void;
}

export const RangeCalendarContext = context<RangeCalendarContextValue | undefined>(undefined);

export function useRangeCalendarContext(): RangeCalendarContextValue {
  const value = RangeCalendarContext();
  if (!value) {
    throw new Error("RangeCalendar components must be used within a <RangeCalendar> component.");
  }
  return value;
}

/** One date grid's derived collection. */
export interface RangeCalendarGridContextValue {
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

export const RangeCalendarGridContext = context<RangeCalendarGridContextValue | undefined>(
  undefined,
);

export function useRangeCalendarGridContext(): RangeCalendarGridContextValue {
  const value = RangeCalendarGridContext();
  if (!value) {
    throw new Error(
      "RangeCalendar grid parts must be used within a <RangeCalendar.Grid> component.",
    );
  }
  return value;
}

/**
 * Where a cell sits in its week row (port sheet §3). The track's row-end
 * rounding and its break at a month boundary can only be decided with the
 * neighbours' `isOutsideMonth` (R-035/R-036/R-047/R-048), and NSH has no
 * `:first-child`, `:has()` or sibling selectors, so `GridBody` registers the
 * four values with each cell it builds.
 */
export interface RangeCalendarRowValue {
  /** Zero-based column inside the row. */
  column: number;
  /** Slots in this row (7, or `days` in a day view under a week). */
  columnCount: number;
  /** Whether the left neighbour is an outside-month day (false without one). */
  previousOutsideMonth: boolean;
  /** Whether the right neighbour is an outside-month day (false without one). */
  nextOutsideMonth: boolean;
}

export const RangeCalendarRowContext = context<RangeCalendarRowValue | undefined>(undefined);

/** The selected state a `RangeCalendar.Cell` hands its indicator (R-050). */
export interface RangeCalendarCellContextValue {
  isSelected: Accessor<boolean>;
}

export const RangeCalendarCellContext = context<RangeCalendarCellContextValue | undefined>(
  undefined,
);

/** The render-prop values a `RangeCalendar` root's function child receives (D17). */
export interface RangeCalendarRenderProps {
  state: RangeCalendarState;
  isDisabled: Accessor<boolean>;
  isInvalid: Accessor<boolean>;
}
