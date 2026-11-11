import type { CalendarDate, DateDuration, DateValue } from "@internationalized/date";
import {
  DateFormatter,
  endOfMonth,
  getDayOfWeek,
  getWeeksInMonth,
  isSameDay,
  isSameYear,
  maxDate,
  minDate,
  startOfMonth,
  startOfWeek,
  startOfYear,
  toCalendarDate,
} from "@internationalized/date";

import type { CalendarState } from "./create-calendar-state";

/* -------------------------------------------------------------------------------------------------
 * Date arithmetic (React Stately's `@react-stately/calendar/src/utils.ts`)
 * -----------------------------------------------------------------------------------------------*/

/** Whether `date` falls outside the given bounds. */
export function isInvalidDate(
  date: DateValue,
  minValue?: DateValue | null,
  maxValue?: DateValue | null,
): boolean {
  return (
    (minValue != null && date.compare(minValue) < 0) ||
    (maxValue != null && date.compare(maxValue) > 0)
  );
}

/** Clamps a date into the given bounds. */
export function constrainValue(
  date: CalendarDate,
  minValue?: DateValue | null,
  maxValue?: DateValue | null,
): CalendarDate {
  if (minValue) {
    const next = maxDate(date, toCalendarDate(minValue));
    if (next) date = next;
  }
  if (maxValue) {
    const next = minDate(date, toCalendarDate(maxValue));
    if (next) date = next;
  }
  return date;
}

/** Aligns `aligned` so the visible window stays inside the calendar's bounds. */
export function constrainStart(
  date: CalendarDate,
  aligned: CalendarDate,
  duration: DateDuration,
  locale: string,
  minValue?: DateValue | null,
  maxValue?: DateValue | null,
): CalendarDate {
  if (minValue && date.compare(minValue) >= 0) {
    const next = maxDate(aligned, alignStart(toCalendarDate(minValue), duration, locale));
    if (next) aligned = next;
  }
  if (maxValue && date.compare(maxValue) <= 0) {
    const next = minDate(aligned, alignEnd(toCalendarDate(maxValue), duration, locale));
    if (next) aligned = next;
  }
  return aligned;
}

/** The start of the visible window containing `date`. */
export function alignStart(
  date: CalendarDate,
  duration: DateDuration,
  locale: string,
  minValue?: DateValue | null,
  maxValue?: DateValue | null,
): CalendarDate {
  let aligned = date;
  if (duration.years) aligned = startOfYear(date);
  else if (duration.months) aligned = startOfMonth(date);
  else if (duration.weeks || (duration.days && duration.days > 7)) {
    aligned = startOfWeek(date, locale);
  }
  return constrainStart(date, aligned, duration, locale, minValue, maxValue);
}

/** The end-aligned start of the visible window containing `date`. */
export function alignEnd(
  date: CalendarDate,
  duration: DateDuration,
  locale: string,
  minValue?: DateValue | null,
  maxValue?: DateValue | null,
): CalendarDate {
  const d: DateDuration = { ...duration };
  if (d.days) d.days--;
  else if (d.weeks) d.weeks--;
  else if (d.months) d.months--;
  else if (d.years) d.years--;

  const aligned = alignStart(date, duration, locale).subtract(d);
  return constrainStart(date, aligned, duration, locale, minValue, maxValue);
}

/** The centered start of the visible window containing `date`. */
export function alignCenter(
  date: CalendarDate,
  duration: DateDuration,
  locale: string,
  minValue?: DateValue | null,
  maxValue?: DateValue | null,
): CalendarDate {
  const halfDuration: DateDuration = {};
  for (const key of Object.keys(duration) as (keyof DateDuration)[]) {
    const value = duration[key];
    if (value == null) continue;
    halfDuration[key] = Math.floor(value / 2);
    if (halfDuration[key]! > 0 && value % 2 === 0) halfDuration[key]!--;
  }

  const aligned = alignStart(date, duration, locale).subtract(halfDuration);
  return constrainStart(date, aligned, duration, locale, minValue, maxValue);
}

/** The closest selectable date at or before `date`. */
export function previousAvailableDate(
  date: CalendarDate,
  minValue: DateValue,
  isDateUnavailable?: (date: CalendarDate) => boolean,
): CalendarDate | null {
  if (!isDateUnavailable) return date;

  while (date.compare(minValue) >= 0 && isDateUnavailable(date)) {
    date = date.subtract({ days: 1 });
  }

  return date.compare(minValue) >= 0 ? date : null;
}

/** React Stately's duration comparison. */
export function isEqualDuration(a: DateDuration, b: DateDuration): boolean {
  if (a === b) return true;
  return a.days === b.days && a.weeks === b.weeks && a.months === b.months && a.years === b.years;
}

/* -------------------------------------------------------------------------------------------------
 * HeroUI's own date helpers (`packages/react/src/utils/calendar.ts`)
 * -----------------------------------------------------------------------------------------------*/

/** The year offset between the Gregorian calendar and `identifier`. */
export function getGregorianYearOffset(identifier: string): number {
  switch (identifier) {
    case "buddhist":
      return 543;
    case "ethiopic":
    case "ethioaa":
      return -8;
    case "coptic":
      return -284;
    case "hebrew":
      return 3760;
    case "indian":
      return -78;
    case "islamic-civil":
    case "islamic-tbla":
    case "islamic-umalqura":
      return -579;
    case "persian":
      return -600;
    case "roc":
    case "japanese":
    case "gregory":
    default:
      return 0;
  }
}

/** Every year start between `start` and `end`, calendar-aware. */
export function getYearRange(start?: DateValue | null, end?: DateValue | null): DateValue[] {
  const years: DateValue[] = [];
  if (!start || !end) return years;

  let current = startOfYear(start);
  while (current.compare(end) <= 0) {
    years.push(current);
    current = startOfYear(current.add({ years: 1 }));
  }
  return years;
}

export type FirstDayOfWeek = "sun" | "mon" | "tue" | "wed" | "thu" | "fri" | "sat";
export type WeekdayStyle = "narrow" | "short" | "long";

/** Weekday labels for the day view's own header (HeroUI's helper). */
export function getDayViewWeekDayLabels(
  start: DateValue,
  locale: string,
  firstDayOfWeek: FirstDayOfWeek | undefined,
  weekdayStyle: WeekdayStyle = "short",
  timeZone = "UTC",
): string[] {
  const formatter = new Intl.DateTimeFormat(locale, { weekday: weekdayStyle, timeZone });
  const weekStart = startOfWeek(start, locale, firstDayOfWeek);
  const labels: string[] = [];
  let date = weekStart;

  for (let index = 0; index < 7; index++) {
    labels.push(formatter.format(date.toDate(timeZone)));
    const next = date.add({ days: 1 });
    if (isSameDay(date, next)) break;
    date = next;
  }

  while (labels.length < 7) labels.push("");
  return labels;
}

function buildDayViewWeekRow(rowStart: DateValue, end: DateValue): (DateValue | null)[] {
  const row: (DateValue | null)[] = [];
  let date = rowStart;

  for (let index = 0; index < 7; index++) {
    row.push(date.compare(end) > 0 ? null : date);
    const next = date.add({ days: 1 });
    if (isSameDay(date, next)) {
      while (row.length < 7) row.push(null);
      return row;
    }
    date = next;
  }

  return row;
}

/** Week-aligned rows for a day view with seven or more days. */
export function getDayViewGridRows(
  start: DateValue,
  end: DateValue,
  locale: string,
  firstDayOfWeek?: FirstDayOfWeek,
): (DateValue | null)[][] {
  const rows: (DateValue | null)[][] = [];
  let rowStart = startOfWeek(start, locale, firstDayOfWeek);

  rows.push(buildDayViewWeekRow(rowStart, end));
  rowStart = rowStart.add({ weeks: 1 });

  while (rowStart.compare(end) <= 0) {
    rows.push(buildDayViewWeekRow(rowStart, end));
    const nextWeek = rowStart.add({ weeks: 1 });
    if (isSameDay(rowStart, nextWeek)) break;
    rowStart = nextWeek;
  }

  return rows;
}

/**
 * `weeksInMonth` as HeroUI/RAC take it: a number, or the documented strings
 * (`single` follows the month, `double` rounds up to 4/6, `all` is always 6).
 */
export function resolveWeeksInMonth(
  value: number | "single" | "double" | "all" | undefined,
  date: CalendarDate,
  locale: string,
  firstDayOfWeek?: FirstDayOfWeek,
): number {
  const natural = getWeeksInMonth(date, locale, firstDayOfWeek);
  if (value == null || value === "single") return natural;
  if (value === "all") return 6;
  if (value === "double") return natural % 2 === 0 ? natural : Math.min(natural + 1, 6);
  return value;
}

/* -------------------------------------------------------------------------------------------------
 * Labels
 * -----------------------------------------------------------------------------------------------*/

export interface CalendarHeadingFormatOptions {
  day?: "numeric" | "2-digit";
  month?: "numeric" | "2-digit" | "long" | "short" | "narrow";
  year?: "numeric" | "2-digit";
  era?: "long" | "short" | "narrow";
}

function eraFormat(date: DateValue | undefined): "short" | undefined {
  return date?.calendar.identifier === "gregory" && date.era === "BC" ? "short" : undefined;
}

/** RAC's `useCalendarHeading` as a string. */
export function formatCalendarHeading(
  state: CalendarState,
  options: { offset?: DateDuration; format?: CalendarHeadingFormatOptions } = {},
): string {
  const range = state.visibleRange();
  let startDate = range.start;
  if (options.offset) startDate = startDate.add(options.offset);

  const isDays = Boolean(state.visibleDuration.days || state.visibleDuration.weeks);
  const format = options.format;
  const formatter = new DateFormatter(state.locale, {
    day: format?.day ?? (isDays ? "numeric" : undefined),
    month: format?.month ?? "long",
    year: format?.year ?? "numeric",
    era: format?.era ?? eraFormat(startDate),
    calendar: range.start.calendar.identifier,
    timeZone: state.timeZone,
  });

  if (isDays) {
    return formatter.formatRange(startDate.toDate(state.timeZone), range.end.toDate(state.timeZone));
  }

  return formatter.format(startDate.toDate(state.timeZone));
}

/** RAC's `useVisibleRangeDescription` with the grid's own start/end. */
export function formatVisibleRangeDescription(
  startDate: CalendarDate,
  endDate: CalendarDate,
  timeZone: string,
  locale: string,
): string {
  const era = eraFormat(startDate) ?? eraFormat(endDate);
  const monthFormatter = new DateFormatter(locale, {
    month: "long",
    year: "numeric",
    era,
    calendar: startDate.calendar.identifier,
    timeZone,
  });
  const dateFormatter = new DateFormatter(locale, {
    month: "long",
    year: "numeric",
    day: "numeric",
    era,
    calendar: startDate.calendar.identifier,
    timeZone,
  });

  if (isSameDay(startDate, startOfMonth(startDate))) {
    if (isSameDay(endDate, endOfMonth(startDate))) {
      return monthFormatter.format(startDate.toDate(timeZone));
    }
    if (isSameDay(endDate, endOfMonth(endDate))) {
      return monthFormatter.formatRange(startDate.toDate(timeZone), endDate.toDate(timeZone));
    }
  }

  return dateFormatter.formatRange(startDate.toDate(timeZone), endDate.toDate(timeZone));
}

/** The workbook's day-of-week index, used with `getDayOfWeek`. */
export { getDayOfWeek, isSameDay, isSameYear };
