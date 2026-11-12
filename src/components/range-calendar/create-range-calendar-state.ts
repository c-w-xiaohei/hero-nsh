import type { Accessor } from "nsh";
import { computed, signal } from "nsh";
import type {
  Calendar,
  CalendarDate,
  CalendarIdentifier,
  DateDuration,
  DateValue,
} from "@internationalized/date";
import { isSameDay, toCalendar, toCalendarDate } from "@internationalized/date";

import { createControllableSignal } from "../../primitives/create-controllable-signal";
import type {
  CalendarPageBehavior,
  CalendarSelectionAlignment,
  CalendarState,
  CalendarWeeksInMonth,
} from "../calendar/create-calendar-state";
import { createCalendarState } from "../calendar/create-calendar-state";
import type { CalendarOrRangeState, FirstDayOfWeek } from "../calendar/date-utils";
import { isInvalidDate } from "../calendar/date-utils";

/** HeroUI's `RangeValue<DateValue>`: the two ends of a selected range. */
export interface RangeCalendarValue<T extends DateValue = DateValue> {
  start: T;
  end: T;
}

/** A range in the calendar's own dates, as `highlightedRange` reports it. */
export interface RangeCalendarSelection {
  start: CalendarDate;
  end: CalendarDate;
}

/** HeroUI's `selectionAlignment` in range mode; `start` by default (§1.2). */
export type RangeCalendarSelectionAlignment = CalendarSelectionAlignment;

/**
 * One range calendar's state. React Stately's `useRangeCalendarState` on top of
 * the shared single-date core (`createCalendarState`), which owns everything
 * both calendars share: locale and calendar system, bounds, the focused date,
 * the visible window and paging. Only the range parts are added here:
 * `value`, `anchorDate`, `highlightedRange`, the two-press `selectDate`, the
 * three selection predicates and `isValueInvalid` (port sheet §2.1, §5).
 */
export interface RangeCalendarState extends CalendarOrRangeState {
  isDisabled: boolean;
  isReadOnly: boolean;
  /** Whether the range may contain unavailable dates. @default false */
  allowsNonContiguousRanges: boolean;

  /** The selected range, controlled or not. */
  value: Accessor<RangeCalendarValue<DateValue> | null>;

  /** The range the grid paints: the anchor stretched to the focused date while
   * a selection is in progress, otherwise `value`. */
  highlightedRange: Accessor<RangeCalendarSelection | null>;

  /** The first press of a range in progress; the second press clears it. */
  anchorDate: Accessor<CalendarDate | null>;

  /** Whether the day grid holds the keyboard focus. */
  isFocused: Accessor<boolean>;

  /** Whether the selected range is out of bounds or holds an unavailable date. */
  isValueInvalid: Accessor<boolean>;

  setValue: (value: RangeCalendarValue<DateValue> | null) => void;
  setAnchorDate: (date: CalendarDate | null) => void;

  focusNextDay: () => void;
  focusPreviousDay: () => void;
  focusNextRow: () => void;
  focusPreviousRow: () => void;
  focusNextPage: () => void;
  focusPreviousPage: () => void;
  focusSectionStart: () => void;
  focusSectionEnd: () => void;
  focusNextSection: (larger?: boolean) => void;
  focusPreviousSection: (larger?: boolean) => void;

  /** Presses the focused date (React Stately's `selectFocusedDate`). */
  selectFocusedDate: () => void;

  /** One press of a day: starts a range, then completes it. */
  selectDate: (date: CalendarDate) => void;

  /** Whether `date` is outside the bounds. */
  isInvalid: (date: DateValue) => boolean;

  /** Whether `date` falls inside `highlightedRange`. */
  isSelected: (date: DateValue) => boolean;
  /** Whether `date` is the range's start. */
  isSelectionStart: (date: DateValue) => boolean;
  /** Whether `date` is the range's end. */
  isSelectionEnd: (date: DateValue) => boolean;

  isCellFocused: (date: DateValue) => boolean;
  isCellDisabled: (date: DateValue) => boolean;
  isCellUnavailable: (date: DateValue) => boolean;
  isPreviousVisibleRangeInvalid: () => boolean;
  isNextVisibleRangeInvalid: () => boolean;
  getDatesInWeek: (weekIndex: number, from?: CalendarDate) => (CalendarDate | null)[];
  getWeeksInMonth: (date?: CalendarDate) => number;
}

export interface CreateRangeCalendarStateProps {
  locale: string;
  createCalendar?: (name: CalendarIdentifier) => Calendar;
  value?: RangeCalendarValue<DateValue> | null;
  defaultValue?: RangeCalendarValue<DateValue> | null;
  onChange?: (value: RangeCalendarValue<DateValue>) => void;
  focusedValue?: DateValue | null;
  defaultFocusedValue?: DateValue | null;
  onFocusChange?: (date: CalendarDate) => void;
  minValue?: DateValue | null;
  maxValue?: DateValue | null;
  visibleDuration?: DateDuration;
  firstDayOfWeek?: FirstDayOfWeek;
  pageBehavior?: CalendarPageBehavior;
  selectionAlignment?: CalendarSelectionAlignment;
  weeksInMonth?: CalendarWeeksInMonth;
  allowsNonContiguousRanges?: boolean;
  disallowEmptySelection?: boolean;
  isDisabled?: boolean;
  isReadOnly?: boolean;
  /** Asks about one day with the range's other end, as upstream's range mode does. */
  isDateUnavailable?: (date: DateValue, anchorDate: CalendarDate | null) => boolean;
  autoFocus?: boolean;
}

/**
 * Creates one range calendar's state. The single-date core is driven with the
 * range's start only, which is what React Stately does too: the focused date
 * falls back to the selection's start, and the visible window follows the
 * focused date exactly as in a `Calendar`.
 */
export function createRangeCalendarState(
  props: CreateRangeCalendarStateProps,
): RangeCalendarState {
  const base: CalendarState = createCalendarState({
    locale: props.locale,
    createCalendar: props.createCalendar,
    // Controlled only when the owner passed `value`; the core then never writes
    // its own copy, and its one-date selection API stays unused.
    value: props.value !== undefined ? (props.value?.start ?? null) : undefined,
    defaultValue: props.defaultValue?.start ?? null,
    focusedValue: props.focusedValue,
    defaultFocusedValue: props.defaultFocusedValue,
    onFocusChange: props.onFocusChange,
    minValue: props.minValue,
    maxValue: props.maxValue,
    visibleDuration: props.visibleDuration,
    firstDayOfWeek: props.firstDayOfWeek,
    pageBehavior: props.pageBehavior,
    selectionMode: "single",
    // Range mode aligns the window to the selection's start unless the owner
    // says otherwise (port sheet §1.2; the single-date core defaults to center).
    selectionAlignment: props.selectionAlignment ?? "start",
    weeksInMonth: props.weeksInMonth,
    disallowEmptySelection: props.disallowEmptySelection,
    isDisabled: props.isDisabled,
    isReadOnly: props.isReadOnly,
    autoFocus: props.autoFocus,
  });

  const calendar = base.minValue.calendar;

  /** A day in this calendar's system, so every comparison is calendar-aware. */
  const dayOf = (value: DateValue): CalendarDate => toCalendar(toCalendarDate(value), calendar);

  // Selected range (`useControlledState` upstream). `onChange` only fires for a
  // real range: HeroUI's callback takes a `RangeValue`, never `null`.
  //
  // The controlled value is read through a function on every evaluation, not
  // once at creation: a `DateRangePicker` hands its range down as a getter
  // (port sheet §5, first cross-unit change), and the calendar has to follow the
  // picker instead of painting the range it saw at mount. A plain `value` prop
  // reads the same object each time, so a standalone calendar is unchanged.
  const controlledRange = (): RangeCalendarValue<DateValue> | null | undefined => {
    const current = props.value;

    if (current === undefined) {
      return undefined;
    }

    if (!current) {
      return null;
    }

    const start = dayOf(current.start);
    const end = dayOf(current.end);

    return start.compare(end) <= 0 ? { start, end } : { start: end, end: start };
  };

  const [rawValue, setRawValue] = createControllableSignal<RangeCalendarValue<DateValue> | null>({
    value: () => controlledRange(),
    defaultValue: () => props.defaultValue ?? null,
    onChange: (next) => {
      if (next) props.onChange?.(next);
    },
  });

  const value = computed<RangeCalendarValue<DateValue> | null>(() => {
    const current = rawValue();
    if (!current) return null;
    const start = dayOf(current.start);
    const end = dayOf(current.end);
    // A backwards range is painted the same way upstream, which flips it too.
    return start.compare(end) <= 0 ? { start, end } : { start: end, end: start };
  });

  // Upstream keeps the first press in `anchorDate` until a second day is
  // pressed; the highlight then stretches from it to the focused date.
  const anchorDate = signal<CalendarDate | null>(null);

  const highlightedRange = computed<RangeCalendarSelection | null>(() => {
    const anchor = anchorDate();
    if (anchor) {
      const focused = base.focusedDate();
      return anchor.compare(focused) <= 0
        ? { start: anchor, end: focused }
        : { start: focused, end: anchor };
    }
    const current = value();
    return current ? { start: dayOf(current.start), end: dayOf(current.end) } : null;
  });

  const isCellUnavailable = (date: DateValue): boolean =>
    props.isDateUnavailable?.(date, anchorDate()) ?? false;

  const isCellDisabled = (date: DateValue): boolean => base.isCellDisabled(date);

  const isSelected = (date: DateValue): boolean => {
    const range = highlightedRange();
    if (!range) return false;
    // Upstream excludes days a user cannot pick from both the track and the caps.
    if (isCellDisabled(date) || isCellUnavailable(date)) return false;
    const day = dayOf(date);
    return day.compare(range.start) >= 0 && day.compare(range.end) <= 0;
  };

  const isSelectionStart = (date: DateValue): boolean => {
    const range = highlightedRange();
    return range != null && isSameDay(dayOf(date), range.start);
  };

  const isSelectionEnd = (date: DateValue): boolean => {
    const range = highlightedRange();
    return range != null && isSameDay(dayOf(date), range.end);
  };

  /** React Stately's per-day scan of a range that may not skip unavailable dates. */
  const containsUnavailableDate = (start: CalendarDate, end: CalendarDate): boolean => {
    if (!props.isDateUnavailable) return false;
    let date = start;
    for (;;) {
      if (props.isDateUnavailable(date, anchorDate())) return true;
      if (date.compare(end) >= 0) return false;
      const next = date.add({ days: 1 });
      if (isSameDay(date, next)) return false;
      date = next;
    }
  };

  const isValueInvalid = computed<boolean>(() => {
    const current = value();
    if (!current) return false;
    const start = dayOf(current.start);
    const end = dayOf(current.end);
    if (isInvalidDate(start, base.minValue, base.maxValue)) return true;
    if (isInvalidDate(end, base.minValue, base.maxValue)) return true;
    if (props.allowsNonContiguousRanges === true) {
      return isCellUnavailable(start) || isCellUnavailable(end);
    }
    return containsUnavailableDate(start, end);
  });

  const setValue = (next: RangeCalendarValue<DateValue> | null) => {
    if (props.isDisabled || props.isReadOnly) return;
    if (next === null) {
      if (props.disallowEmptySelection) return;
      anchorDate.set(null);
      setRawValue(null);
      return;
    }
    const start = dayOf(next.start);
    const end = dayOf(next.end);
    setRawValue(start.compare(end) <= 0 ? { start, end } : { start: end, end: start });
  };

  const selectDate = (date: CalendarDate) => {
    if (props.isDisabled || props.isReadOnly) return;
    if (isInvalidDate(date, base.minValue, base.maxValue)) return;
    const day = dayOf(date);
    const anchor = anchorDate();
    if (!anchor) {
      // Upstream's first press closes a one-day range and keeps the anchor, so
      // the next press completes it; `onChange` may therefore fire once here.
      anchorDate.set(day);
      setValue({ start: day, end: day });
      return;
    }
    anchorDate.set(null);
    setValue({ start: anchor, end: day });
  };

  const selectFocusedDate = () => {
    const date = base.focusedDate();
    if (props.isDateUnavailable?.(date, anchorDate())) return;
    selectDate(date);
  };

  return {
    ...base,
    // The core's one-date selection surface is replaced by the range one below.
    allowsNonContiguousRanges: props.allowsNonContiguousRanges ?? false,
    value,
    highlightedRange,
    anchorDate,
    isValueInvalid,
    setValue,
    setAnchorDate: (date) => anchorDate.set(date),
    selectDate,
    selectFocusedDate,
    isSelected,
    isSelectionStart,
    isSelectionEnd,
    isCellUnavailable,
    isCellDisabled,
  };
}
