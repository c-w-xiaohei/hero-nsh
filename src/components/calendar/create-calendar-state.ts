import type { Accessor } from "nsh";
import { computed, effect, signal, untracked } from "nsh";
import type {
  Calendar,
  CalendarDate,
  CalendarIdentifier,
  DateDuration,
  DateValue,
} from "@internationalized/date";
import {
  CalendarDate as CalendarDateClass,
  DateFormatter,
  GregorianCalendar,
  createCalendar as createCalendarFromIdentifier,
  endOfMonth,
  endOfWeek,
  getDayOfWeek,
  isSameDay,
  minDate,
  startOfWeek,
  startOfMonth,
  toCalendar,
  toCalendarDate,
  today,
} from "@internationalized/date";

import { createControllableSignal } from "../../primitives/create-controllable-signal";
import type { FirstDayOfWeek } from "./date-utils";
import {
  alignCenter,
  alignEnd,
  alignStart,
  constrainStart,
  constrainValue,
  getGregorianYearOffset,
  isInvalidDate,
  previousAvailableDate,
  resolveWeeksInMonth,
} from "./date-utils";

export type CalendarSelectionMode = "single" | "multiple";
export type CalendarPageBehavior = "visible" | "single";
export type CalendarSelectionAlignment = "start" | "center" | "end";
export type CalendarWeeksInMonth = number | "single" | "double" | "all";

/** One calendar's state, React Stately's `CalendarState` in Solid terms. */
export interface CalendarState {
  isDisabled: boolean;
  isReadOnly: boolean;
  selectionMode: CalendarSelectionMode;
  visibleDuration: DateDuration;
  locale: string;
  timeZone: string;
  firstDayOfWeek?: FirstDayOfWeek;
  minValue: DateValue;
  maxValue: DateValue;
  value: Accessor<DateValue | DateValue[] | null>;
  focusedDate: Accessor<CalendarDate>;
  visibleRange: Accessor<{ start: CalendarDate; end: CalendarDate }>;
  isFocused: Accessor<boolean>;
  isValueInvalid: Accessor<boolean>;
  setValue: (value: DateValue | DateValue[] | null) => void;
  setFocusedDate: (date: DateValue) => void;
  setFocused: (focused: boolean) => void;
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
  selectFocusedDate: () => void;
  selectDate: (date: CalendarDate) => void;
  isInvalid: (date: DateValue) => boolean;
  isSelected: (date: DateValue) => boolean;
  isCellFocused: (date: DateValue) => boolean;
  isCellDisabled: (date: DateValue) => boolean;
  isCellUnavailable: (date: DateValue) => boolean;
  isPreviousVisibleRangeInvalid: () => boolean;
  isNextVisibleRangeInvalid: () => boolean;
  getDatesInWeek: (weekIndex: number, from?: CalendarDate) => (CalendarDate | null)[];
  getWeeksInMonth: (date?: CalendarDate) => number;
}

export interface CreateCalendarStateProps {
  locale: string;
  createCalendar?: (name: CalendarIdentifier) => Calendar;
  value?: DateValue | DateValue[] | null;
  defaultValue?: DateValue | DateValue[] | null;
  onChange?: (value: DateValue | DateValue[] | null) => void;
  focusedValue?: DateValue | null;
  defaultFocusedValue?: DateValue | null;
  onFocusChange?: (date: CalendarDate) => void;
  minValue?: DateValue | null;
  maxValue?: DateValue | null;
  visibleDuration?: DateDuration;
  firstDayOfWeek?: FirstDayOfWeek;
  pageBehavior?: CalendarPageBehavior;
  selectionMode?: CalendarSelectionMode;
  selectionAlignment?: CalendarSelectionAlignment;
  weeksInMonth?: CalendarWeeksInMonth;
  disallowEmptySelection?: boolean;
  isDisabled?: boolean;
  isReadOnly?: boolean;
  isDateUnavailable?: (date: DateValue) => boolean;
  autoFocus?: boolean;
}

function unitDuration(duration: DateDuration): DateDuration {
  const unit: DateDuration = {};
  for (const key of Object.keys(duration) as (keyof DateDuration)[]) {
    const value = duration[key];
    if (value != null) unit[key] = 1;
  }
  return unit;
}

function addDuration(start: CalendarDate, duration: DateDuration): CalendarDate {
  const d: DateDuration = { ...duration };
  if (d.days) d.days--;
  else d.days = -1;
  return start.add(d);
}

function calendarDate(calendar: Calendar, value: DateValue): CalendarDate {
  return toCalendar(toCalendarDate(value), calendar);
}

/**
 * Creates one calendar's state. React Stately's `useCalendarState` rewritten
 * with NSH signals and pass-through accessors (research 4.7.4): the owner's
 * `focusedValue` stays controlled, page moves keep a start-date signal exactly
 * as upstream's `setStartDate` does, and every rule below cites its upstream
 * counterpart.
 */
export function createCalendarState(props: CreateCalendarStateProps): CalendarState {
  const locale = props.locale;
  const visibleDuration = props.visibleDuration ?? { months: 1 };
  const selectionMode = props.selectionMode ?? "single";
  const pageBehavior = props.pageBehavior ?? "visible";
  const resolvedOptions = new DateFormatter(locale).resolvedOptions();
  const calendar = (props.createCalendar ?? createCalendarFromIdentifier)(
    resolvedOptions.calendar as CalendarIdentifier,
  );
  const timeZone = resolvedOptions.timeZone;

  const minValue =
    props.minValue ??
    new CalendarDateClass(calendar, 1900 + getGregorianYearOffset(calendar.identifier), 1, 1);
  const maxValue =
    props.maxValue ??
    new CalendarDateClass(calendar, 2099 + getGregorianYearOffset(calendar.identifier), 12, 31);

  // Selected value (`useControlledState` upstream).
  const [rawValue, setRawValue] = createControllableSignal<DateValue | DateValue[] | null>({
    value: () => (props.value !== undefined ? props.value : undefined),
    defaultValue: () => (props.defaultValue !== undefined ? props.defaultValue : null),
    onChange: (next) => props.onChange?.(next),
  });

  const calendarValue = computed<DateValue | DateValue[] | null>(() => {
    const value = rawValue();
    if (Array.isArray(value)) return value.map((date) => calendarDate(calendar, date));
    return value ? calendarDate(calendar, value) : null;
  });

  // Focused date (`useControlledState(props.focusedValue)` upstream).
  const controlledFocused = computed<CalendarDate | undefined>(() =>
    props.focusedValue
      ? constrainValue(calendarDate(calendar, props.focusedValue), minValue, maxValue)
      : undefined,
  );
  const initialFocused = (() => {
    if (props.defaultFocusedValue) {
      return constrainValue(calendarDate(calendar, props.defaultFocusedValue), minValue, maxValue);
    }
    const selected = calendarValue();
    if (selected) {
      return constrainValue(
        toCalendarDate(Array.isArray(selected) ? selected[0]! : selected),
        minValue,
        maxValue,
      );
    }
    return constrainValue(toCalendar(today(timeZone), calendar), minValue, maxValue);
  })();

  const [focusedDateState, setFocusedDateValue] = createControllableSignal<CalendarDate>({
    value: controlledFocused,
    defaultValue: () => initialFocused,
    onChange: (date) => props.onFocusChange?.(date),
  });
  const focusedDate = computed<CalendarDate>(() => focusedDateState() ?? initialFocused);

  const startForFocused = (date: CalendarDate): CalendarDate => {
    switch (props.selectionAlignment) {
      case "start":
        return alignStart(date, visibleDuration, locale, minValue, maxValue);
      case "end":
        return alignEnd(date, visibleDuration, locale, minValue, maxValue);
      case "center":
      default:
        return alignCenter(date, visibleDuration, locale, minValue, maxValue);
    }
  };

  const startDate = signal<CalendarDate>(startForFocused(initialFocused));
  const endDate = computed(() => addDuration(startDate(), visibleDuration));
  const visibleRange = computed(() => ({ start: startDate(), end: endDate() }));

  /** React Stately's render-time range repair, run whenever focus moves. */
  const syncStartDate = (date: CalendarDate) => {
    untracked(() => {
      const start = startDate();
      const end = addDuration(start, visibleDuration);
      if (isInvalidDate(date, minValue, maxValue)) {
        focusCell(constrainValue(date, minValue, maxValue));
      } else if (date.compare(start) < 0) {
        startDate.set(alignEnd(date, visibleDuration, locale, minValue, maxValue));
      } else if (date.compare(end) > 0) {
        startDate.set(alignStart(date, visibleDuration, locale, minValue, maxValue));
      }
    });
  };

  const isFocused = signal(props.autoFocus ?? false);

  const pageDuration = computed(() =>
    pageBehavior === "visible" ? visibleDuration : unitDuration(visibleDuration),
  );

  function focusCell(date: DateValue) {
    const next = constrainValue(calendarDate(calendar, date), minValue, maxValue);
    setFocusedDateValue(next);
    syncStartDate(next);
  }

  function normalizeValue(next: CalendarDate): DateValue | null {
    const constrained = constrainValue(next, minValue, maxValue);
    const lowerBound = minDate(constrained, startDate());
    const previous = previousAvailableDate(
      constrained,
      minValue ?? lowerBound,
      props.isDateUnavailable,
    );
    if (!previous) return null;

    const value = rawValue();
    const baseValue = Array.isArray(value) ? value[0] : value;
    const nextValue = toCalendar(previous, baseValue?.calendar ?? new GregorianCalendar());

    if (baseValue && "hour" in baseValue) {
      return (baseValue as DateValue).set(nextValue) as DateValue;
    }

    return nextValue;
  }

  function setValue(next: CalendarDate | CalendarDate[] | null) {
    if (props.isDisabled || props.isReadOnly) return;

    if (next === null) {
      setRawValue(selectionMode === "multiple" ? [] : null);
      return;
    }

    if (Array.isArray(next)) {
      setRawValue(next.map(normalizeValue).filter(Boolean) as DateValue[]);
      return;
    }

    const local = normalizeValue(next);
    if (local) setRawValue(local);
  }

  // A controlled `focusedValue` can arrive from the owner without going
  // through `focusCell`; repair the window when it does.
  effect(() => {
    const date = focusedDate();
    untracked(() => syncStartDate(date));
  });

  const isValueInvalid = computed(() => {
    const value = calendarValue();
    if (!value) return false;
    if (Array.isArray(value)) {
      return value.some(
        (date) => props.isDateUnavailable?.(date) || isInvalidDate(date, minValue, maxValue),
      );
    }
    return props.isDateUnavailable?.(value) || isInvalidDate(value, minValue, maxValue);
  });

  return {
    isDisabled: props.isDisabled ?? false,
    isReadOnly: props.isReadOnly ?? false,
    selectionMode,
    visibleDuration,
    locale,
    timeZone,
    firstDayOfWeek: props.firstDayOfWeek,
    minValue,
    maxValue,
    value: calendarValue,
    focusedDate,
    visibleRange,
    isFocused,
    isValueInvalid,
    setValue: (value) => {
      if (value === null) {
        setValue(null);
        return;
      }
      if (Array.isArray(value)) {
        setValue(value.map((date) => calendarDate(calendar, date)));
        return;
      }
      setValue(calendarDate(calendar, value));
    },
    setFocusedDate: (date) => focusCell(date),
    setFocused: (focused) => isFocused.set(focused),
    focusNextDay: () => focusCell(focusedDate().add({ days: 1 })),
    focusPreviousDay: () => focusCell(focusedDate().subtract({ days: 1 })),
    focusNextRow() {
      if (visibleDuration.days) this.focusNextPage();
      else focusCell(focusedDate().add({ weeks: 1 }));
    },
    focusPreviousRow() {
      if (visibleDuration.days) this.focusPreviousPage();
      else focusCell(focusedDate().subtract({ weeks: 1 }));
    },
    focusNextPage() {
      const start = startDate().add(pageDuration());
      const focused = focusedDate();
      setFocusedDateValue(constrainValue(focused.add(pageDuration()), minValue, maxValue));
      startDate.set(
        alignStart(
          constrainStart(focused, start, pageDuration(), locale, minValue, maxValue),
          pageDuration(),
          locale,
        ),
      );
    },
    focusPreviousPage() {
      const start = startDate().subtract(pageDuration());
      const focused = focusedDate();
      setFocusedDateValue(constrainValue(focused.subtract(pageDuration()), minValue, maxValue));
      startDate.set(
        alignStart(
          constrainStart(focused, start, pageDuration(), locale, minValue, maxValue),
          pageDuration(),
          locale,
        ),
      );
    },
    focusSectionStart() {
      if (visibleDuration.days) focusCell(startDate());
      else if (visibleDuration.weeks) focusCell(startOfWeek(focusedDate(), locale));
      else focusCell(startOfMonth(focusedDate()));
    },
    focusSectionEnd() {
      if (visibleDuration.days) focusCell(endDate());
      else if (visibleDuration.weeks) focusCell(endOfWeek(focusedDate(), locale));
      else focusCell(endOfMonth(focusedDate()));
    },
    focusNextSection(larger = false) {
      if (!larger && !visibleDuration.days) {
        focusCell(focusedDate().add(unitDuration(visibleDuration)));
        return;
      }
      if (visibleDuration.days) this.focusNextPage();
      else if (visibleDuration.weeks) focusCell(focusedDate().add({ months: 1 }));
      else focusCell(focusedDate().add({ years: 1 }));
    },
    focusPreviousSection(larger = false) {
      if (!larger && !visibleDuration.days) {
        focusCell(focusedDate().subtract(unitDuration(visibleDuration)));
        return;
      }
      if (visibleDuration.days) this.focusPreviousPage();
      else if (visibleDuration.weeks) focusCell(focusedDate().subtract({ months: 1 }));
      else focusCell(focusedDate().subtract({ years: 1 }));
    },
    selectFocusedDate() {
      if (!(props.isDateUnavailable && props.isDateUnavailable(focusedDate()))) {
        this.selectDate(focusedDate());
      }
    },
    selectDate(date: CalendarDate) {
      if (props.isDisabled || props.isReadOnly) return;

      if (selectionMode === "multiple") {
        const next = normalizeValue(date);
        if (!next) return;

        const value = rawValue();
        const base: DateValue[] = Array.isArray(value)
          ? value
          : value != null
            ? [value]
            : [];
        const index = base.findIndex((entry) => isSameDay(entry, next));
        if (index >= 0 && props.disallowEmptySelection && base.length === 1) return;
        setRawValue(
          index >= 0
            ? base.slice(0, index).concat(base.slice(index + 1))
            : [...base, next],
        );
        return;
      }

      setValue(date);
    },
    isInvalid: (date) => isInvalidDate(date, minValue, maxValue),
    isSelected(date) {
      const value = calendarValue();
      if (!value || this.isCellDisabled(date) || this.isCellUnavailable(date)) return false;
      return Array.isArray(value)
        ? value.some((entry) => isSameDay(entry, date))
        : isSameDay(date, value);
    },
    isCellFocused: (date) => isFocused() && isSameDay(date, focusedDate()),
    isCellDisabled: (date) =>
      props.isDisabled === true ||
      date.compare(startDate()) < 0 ||
      date.compare(endDate()) > 0 ||
      isInvalidDate(date, minValue, maxValue),
    isCellUnavailable: (date) => props.isDateUnavailable?.(date) ?? false,
    isPreviousVisibleRangeInvalid() {
      const previous = startDate().subtract({ days: 1 });
      return isSameDay(previous, startDate()) || isInvalidDate(previous, minValue, maxValue);
    },
    isNextVisibleRangeInvalid() {
      const next = endDate().add({ days: 1 });
      return isSameDay(next, endDate()) || isInvalidDate(next, minValue, maxValue);
    },
    getDatesInWeek(weekIndex, from = startDate()) {
      let date = from.add({ weeks: weekIndex });
      const dates: (CalendarDate | null)[] = [];
      const days = visibleDuration.days && visibleDuration.days < 7 ? visibleDuration.days : 7;

      if (days === 7) {
        date = startOfWeek(date, locale, props.firstDayOfWeek);
        const dayOfWeek = getDayOfWeek(date, locale, props.firstDayOfWeek);
        for (let index = 0; index < dayOfWeek; index++) dates.push(null);
      }

      while (dates.length < days) {
        dates.push(date);
        const next = date.add({ days: 1 });
        if (isSameDay(date, next)) break;
        date = next;
      }
      while (dates.length < days) dates.push(null);
      return dates;
    },
    getWeeksInMonth(date = startDate()) {
      let weeks = resolveWeeksInMonth(props.weeksInMonth, date, locale, props.firstDayOfWeek);
      if (visibleDuration.weeks || visibleDuration.days) {
        weeks = visibleDuration.weeks ?? 0;
        if (visibleDuration.days) weeks += Math.ceil(visibleDuration.days / 7);
      }
      return weeks;
    },
  };
}
