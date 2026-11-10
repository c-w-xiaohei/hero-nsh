import type { AnyDateTime, Calendar, DateValue, ZonedDateTime } from "@internationalized/date";
import { CalendarDate } from "@internationalized/date";

import type { DateSegmentType, HourCycle } from "./date-field-utils";
import { cycleValue, fromHourCycle, toHourCycle } from "./date-field-utils";

/**
 * React Stately's `IncompleteDate` (`@react-stately/datepicker`), ported to
 * plain TypeScript.
 *
 * It represents a date that is incomplete or temporarily invalid because the
 * user is editing it (February 31st), and keeps the time in the display's hour
 * cycle so the day period can be adjusted independently from the hour.
 */
export class IncompleteDate {
  calendar: Calendar;
  era: string | null;
  year: number | null;
  month: number | null;
  day: number | null;
  hour: number | null;
  hourCycle: HourCycle;
  dayPeriod: number | null;
  minute: number | null;
  second: number | null;
  millisecond: number | null;
  offset: number | null;

  constructor(
    calendar: Calendar,
    hourCycle: HourCycle,
    dateValue?: Partial<Omit<AnyDateTime, "copy">> | null,
  ) {
    this.era = dateValue?.era ?? null;
    this.calendar = calendar;
    this.year = dateValue?.year ?? null;
    this.month = dateValue?.month ?? null;
    this.day = dateValue?.day ?? null;
    this.hour = dateValue?.hour ?? null;
    this.hourCycle = hourCycle;
    this.dayPeriod = null;
    this.minute = dateValue?.minute ?? null;
    this.second = dateValue?.second ?? null;
    this.millisecond = dateValue?.millisecond ?? null;
    this.offset = (dateValue as { offset?: number } | undefined)?.offset ?? null;

    // Convert the hour from 24 hour time to the given hour cycle.
    if (this.hour != null) {
      const [dayPeriod, hour] = toHourCycle(this.hour, hourCycle);

      this.dayPeriod = dayPeriod;
      this.hour = hour;
    }
  }

  copy(): IncompleteDate {
    const result = new IncompleteDate(this.calendar, this.hourCycle);

    result.era = this.era;
    result.year = this.year;
    result.month = this.month;
    result.day = this.day;
    result.hour = this.hour;
    result.dayPeriod = this.dayPeriod;
    result.minute = this.minute;
    result.second = this.second;
    result.millisecond = this.millisecond;
    result.offset = this.offset;

    return result;
  }

  /** The stored value of one segment, for React Stately's `this[segment]` lookups. */
  read(field: string): number | string | null {
    switch (field) {
      case "era":
        return this.era;
      case "year":
        return this.year;
      case "month":
        return this.month;
      case "day":
        return this.day;
      case "hour":
        return this.hour;
      case "dayPeriod":
      case "dayperiod":
        return this.dayPeriod;
      case "minute":
        return this.minute;
      case "second":
        return this.second;
      default:
        return null;
    }
  }

  private write(field: DateSegmentType, value: number | string | null): void {
    switch (field) {
      case "era":
        this.era = value as string | null;
        break;
      case "year":
        this.year = value as number | null;
        break;
      case "month":
        this.month = value as number | null;
        break;
      case "day":
        this.day = value as number | null;
        break;
      case "hour":
        this.hour = value as number | null;
        break;
      case "dayPeriod":
        this.dayPeriod = value as number | null;
        break;
      case "minute":
        this.minute = value as number | null;
        break;
      case "second":
        this.second = value as number | null;
        break;
    }
  }

  /** Checks whether all the specified segments have a value. */
  isComplete(segments: DateSegmentType[]): boolean {
    return segments.every((segment) => this.read(segment) != null);
  }

  /** Checks whether the given date value matches this value for the specified segments. */
  validate(dt: DateValue, segments: DateSegmentType[]): boolean {
    return segments.every((segment) => {
      if ((segment === "hour" || segment === "dayPeriod") && "hour" in dt) {
        const [dayPeriod, hour] = toHourCycle(dt.hour, this.hourCycle);

        return this.dayPeriod === dayPeriod && this.hour === hour;
      }

      return this.read(segment) === readDateValue(dt, segment);
    });
  }

  /** Checks if the date is empty (i.e. all specified segments are null). */
  isCleared(segments: DateSegmentType[]): boolean {
    return segments.every((segment) => this.read(segment) === null);
  }

  /** Sets the given field. */
  set(field: DateSegmentType, value: number | string, placeholder: DateValue): IncompleteDate {
    const result = this.copy();

    result.write(field, value);

    if (field === "hour" && result.dayPeriod == null && "hour" in placeholder) {
      result.dayPeriod = toHourCycle(placeholder.hour, this.hourCycle)[0];
    }

    if (field === "year" && result.era == null) {
      result.era = placeholder.era;
    }

    // Clear the offset when a date/time field changes since it may no longer be valid.
    if (field !== "second" && field !== "literal" && field !== "timeZoneName") {
      result.offset = null;
    }

    return result;
  }

  /** Sets the given field to null. */
  clear(field: DateSegmentType): IncompleteDate {
    const result = this.copy();

    result.write(field, null);

    if (field === "year") {
      result.era = null;
    }

    // Clear the offset when a field is cleared since it may no longer be valid.
    result.offset = null;

    return result;
  }

  /**
   * Increments or decrements the given field. If it is null, then it is set to
   * the placeholder value.
   */
  cycle(
    field: DateSegmentType,
    amount: number,
    placeholder: DateValue,
    displaySegments: DateSegmentType[],
  ): IncompleteDate {
    const result = this.copy();

    // If the field is null, default to the placeholder.
    if (
      result.read(field) == null &&
      field !== "dayPeriod" &&
      field !== "era"
    ) {
      if (field === "hour" && "hour" in placeholder) {
        const [dayPeriod, hour] = toHourCycle(placeholder.hour, this.hourCycle);

        result.dayPeriod = dayPeriod;
        result.hour = hour;
      } else {
        result.write(field, readDateValue(placeholder, field) as number | string | null);
      }

      if (field === "year" && result.era == null) {
        result.era = placeholder.era;
      }

      return result;
    }

    switch (field) {
      case "era": {
        const eras = this.calendar.getEras();
        let index = eras.indexOf(result.era ?? "");

        index = cycleValue(index, amount, 0, eras.length - 1);
        result.era = eras[index];
        break;
      }
      case "year": {
        // Use CalendarDate to cycle so the era updates between 1 AD and 1 BC.
        let date = new CalendarDate(
          this.calendar,
          this.era ?? placeholder.era,
          this.year ?? placeholder.year,
          this.month ?? 1,
          this.day ?? 1,
        );

        date = date.cycle(field, amount, { round: field === "year" });
        result.era = date.era;
        result.year = date.year;
        break;
      }
      case "month":
        result.month = cycleValue(
          result.month ?? 1,
          amount,
          1,
          this.calendar.getMaximumMonthsInYear(),
        );
        break;
      case "day":
        // Allow incrementing up to the maximum number of days in any month.
        result.day = cycleValue(
          result.day ?? 1,
          amount,
          1,
          this.calendar.getMaximumDaysInMonth(),
        );
        break;
      case "hour": {
        // When the date is fully defined (or the field is time only) and the
        // placeholder carries a time zone, cycle through `toValue` so a DST
        // fallback is handled.
        const hasDateSegments = displaySegments.some((segment) =>
          ["year", "month", "day"].includes(segment),
        );

        if (
          "timeZone" in placeholder &&
          (!hasDateSegments || (result.year != null && result.month != null && result.day != null))
        ) {
          // A placeholder with a time zone is a ZonedDateTime, and `toValue`
          // keeps that class, so cycling on its hour handles a DST fallback.
          const date = result.toValue(placeholder) as ZonedDateTime;
          const cycled = date.cycle("hour", amount, {
            hourCycle: this.hourCycle === "h12" ? 12 : 24,
            round: false,
          });
          const [dayPeriod, adjustedHour] = toHourCycle(cycled.hour, this.hourCycle);

          result.hour = adjustedHour;
          result.dayPeriod = dayPeriod;
          result.offset = cycled.offset;
        } else {
          const hours = result.hour ?? 0;
          const limits = this.getSegmentLimits("hour")!;

          result.hour = cycleValue(hours, amount, limits.minValue, limits.maxValue);

          if (result.dayPeriod == null && "hour" in placeholder) {
            result.dayPeriod = toHourCycle(placeholder.hour, this.hourCycle)[0];
          }
        }
        break;
      }
      case "dayPeriod":
        result.dayPeriod = cycleValue(result.dayPeriod ?? 0, amount, 0, 1);
        break;
      case "minute":
        result.minute = cycleValue(result.minute ?? 0, amount, 0, 59, true);
        break;
      case "second":
        result.second = cycleValue(result.second ?? 0, amount, 0, 59, true);
        break;
    }

    return result;
  }

  /**
   * Converts the incomplete date to a full date value, using the provided value
   * for any unset fields.
   */
  toValue(value: DateValue): DateValue {
    if ("hour" in value) {
      let hour = this.hour;

      if (hour != null) {
        hour = fromHourCycle(hour, this.dayPeriod ?? 0, this.hourCycle);
      } else if (this.hourCycle === "h12" || this.hourCycle === "h11") {
        hour = this.dayPeriod === 1 ? 12 : 0;
      }

      let result = value.set({
        era: this.era ?? value.era,
        year: this.year ?? value.year,
        month: this.month ?? value.month,
        day: this.day ?? value.day,
        hour: hour ?? value.hour,
        minute: this.minute ?? value.minute,
        second: this.second ?? value.second,
        millisecond: this.millisecond ?? value.millisecond,
      });

      if ("offset" in result && this.offset != null && result.offset !== this.offset) {
        result = result.add({ milliseconds: result.offset - this.offset }) as typeof result;
      }

      return result;
    }

    return value.set({
      era: this.era ?? value.era,
      year: this.year ?? value.year,
      month: this.month ?? value.month,
      day: this.day ?? value.day,
    });
  }

  getSegmentLimits(
    type: DateSegmentType,
  ): { value: number | null; minValue: number; maxValue: number } | undefined {
    switch (type) {
      case "era": {
        const eras = this.calendar.getEras();

        return {
          value: this.era != null ? eras.indexOf(this.era) : eras.length - 1,
          minValue: 0,
          maxValue: eras.length - 1,
        };
      }
      case "year":
        return { value: this.year, minValue: 1, maxValue: 9999 };
      case "month":
        return {
          value: this.month,
          minValue: 1,
          maxValue: this.calendar.getMaximumMonthsInYear(),
        };
      case "day":
        return {
          value: this.day,
          minValue: 1,
          maxValue: this.calendar.getMaximumDaysInMonth(),
        };
      case "dayPeriod":
        return { value: this.dayPeriod, minValue: 0, maxValue: 1 };
      case "hour": {
        let minValue = 0;
        let maxValue = 23;

        if (this.hourCycle === "h12") {
          minValue = 1;
          maxValue = 12;
        } else if (this.hourCycle === "h11") {
          minValue = 0;
          maxValue = 11;
        }

        return { value: this.hour, minValue, maxValue };
      }
      case "minute":
        return { value: this.minute, minValue: 0, maxValue: 59 };
      case "second":
        return { value: this.second, minValue: 0, maxValue: 59 };
      default:
        return undefined;
    }
  }
}

function readDateValue(date: DateValue | AnyDateTime, field: string): number | string | null {
  switch (field) {
    case "era":
      return date.era;
    case "year":
      return date.year;
    case "month":
      return date.month;
    case "day":
      return date.day;
    case "hour":
      return "hour" in date ? date.hour : null;
    case "minute":
      return "minute" in date ? date.minute : null;
    case "second":
      return "second" in date ? date.second : null;
    default:
      return null;
  }
}
