import type { Accessor, ViewRef } from "nsh";
import { computed, effect, locale as hostLocale, signal } from "nsh";
import type { CalendarIdentifier, DateValue } from "@internationalized/date";
import {
  CalendarDate,
  DateFormatter,
  GregorianCalendar,
  isEqualCalendar,
  toCalendar,
} from "@internationalized/date";
import { NumberParser } from "@internationalized/number";

import { createControllableSignal } from "../../primitives/create-controllable-signal";
import type {
  DateSegment,
  DateSegmentType,
  FormatterOptions,
  Granularity,
  HourCycle,
  MaxGranularity,
} from "./date-field-utils";
import {
  convertValue,
  createPlaceholderDate,
  defaultCreateCalendar,
  getFormatOptions,
  processSegments,
} from "./date-field-utils";
import { IncompleteDate } from "./incomplete-date";

/* -------------------------------------------------------------------------------------------------
 * Options and result
 * -----------------------------------------------------------------------------------------------*/

/**
 * A validation error, as React Aria's `validate` returns it
 * (`@react-types/shared`): a string is the message, an object carries it in
 * `message`.
 */
export interface DateFieldValidationError {
  key?: string;
  message?: string;
}

/**
 * The inputs of `createDateFieldState`: React Stately's `DateFieldStateOptions`
 * with accessors instead of plain values, so the field follows its owner
 * (research 4.4, D16). `locale` and `createCalendar` default to the host's
 * locale and `@internationalized/date`'s factory; everything else is a
 * `DateFieldProps` member.
 */
export interface CreateDateFieldStateProps {
  /** The value, controlled. */
  value?: Accessor<DateValue | null | undefined>;

  /** The initial value, uncontrolled. */
  defaultValue?: Accessor<DateValue | null | undefined>;

  /** Called with every value the field commits. */
  onChange?: (value: DateValue | null) => void;

  /** The locale the segments are formatted and edited in (default: the host's). */
  locale?: Accessor<string>;

  /** Builds the calendar for an identifier (default: `@internationalized/date`). */
  createCalendar?: Accessor<(name: CalendarIdentifier) => ReturnType<typeof defaultCreateCalendar>>;

  /** Today's date fills the segments this is not given for. */
  placeholderValue?: Accessor<DateValue | null | undefined>;

  /** The smallest unit displayed; defaults from the value (`day`, or `minute`). */
  granularity?: Accessor<Granularity | undefined>;

  /** The largest unit displayed (`year` by default). */
  maxGranularity?: Accessor<MaxGranularity | undefined>;

  /** 12 or 24 hour display; defaults from the locale. */
  hourCycle?: Accessor<12 | 24 | undefined>;

  /** Hides the time zone abbreviation. */
  hideTimeZone?: Accessor<boolean | undefined>;

  /** Forces leading zeros in the month, day and hour segments. */
  shouldForceLeadingZeros?: Accessor<boolean | undefined>;

  /** The minimum allowed date. */
  minValue?: Accessor<DateValue | null | undefined>;

  /** The maximum allowed date. */
  maxValue?: Accessor<DateValue | null | undefined>;

  /** Marks a date the user may not pick. */
  isDateUnavailable?: Accessor<((date: DateValue) => boolean) | undefined>;

  /** Runs at commit; `true` means valid, a string or `{ message }` is the error. */
  validate?: Accessor<
    | ((value: DateValue | null) => true | string | DateFieldValidationError | null | undefined)
    | undefined
  >;

  /** Blocks editing and dims the segments. */
  isDisabled?: Accessor<boolean | undefined>;

  /** Keeps the segments focusable and blocks the value change. */
  isReadOnly?: Accessor<boolean | undefined>;

  /** Marks the field required; the visible asterisk belongs to the Label. */
  isRequired?: Accessor<boolean | undefined>;

  /** Marks the field invalid whatever validation says. */
  isInvalid?: Accessor<boolean | undefined>;
}

/**
 * The field state one date or time field owns: React Stately's
 * `DateFieldState` (the editing half of `useDateFieldState` and
 * `useDateSegment`) with accessors and slot-aware readers, shared by the
 * consuming units through `DateInputGroupFieldContext`.
 *
 * Editing rules are React Stately's, ported one to one: `IncompleteDate` keeps
 * a temporarily invalid value, `cycle` wraps a segment inside its limits, and
 * the typing buffer moves to the next segment once a segment is full.
 */
export interface DateFieldState {
  /** The committed value, in the display calendar. */
  value: Accessor<DateValue | null>;

  /** Sets the value as a parent would; blocked while disabled or read only. */
  setValue: (value: DateValue | null) => void;

  /** The value's own calendar, which emitted values keep. */
  calendar: Accessor<ReturnType<typeof defaultCreateCalendar>>;

  /** The current value as a JavaScript `Date`, for formatting. */
  dateValue: Accessor<Date>;

  /** The formatter the segments and `formatValue` use. */
  dateFormatter: Accessor<Intl.DateTimeFormat>;

  /** The field's segments, in display order. */
  segments: (slot?: string) => DateSegment[];

  /** Whether the field is disabled (its own prop, or its owner's). */
  isDisabled: (slot?: string) => boolean;

  /** Whether the field is read only. */
  isReadOnly: (slot?: string) => boolean;

  /** Whether the field is required. */
  isRequired: (slot?: string) => boolean;

  /** Whether the field is invalid: `isInvalid`, or a committed validation error. */
  isInvalid: (slot?: string) => boolean;

  /** The committed validation messages, for a `FieldError`. */
  validationErrors: Accessor<readonly string[]>;

  /** The segment that currently has the focus, if any. */
  focusedSegment: (slot?: string) => DateSegment | null;

  /** Records the focused segment (the Segment part calls it from `onFocus` / `onBlur`). */
  focusSegment: (segment: DateSegment | null) => void;

  /**
   * Moves the focus to the neighbouring editable segment. No wrap, as React
   * Aria's `focusNext` / `focusPrevious`; the target's real focus arrives
   * through its element, so a host that cannot focus a view simply stays put.
   */
  focusAdjacent: (direction: -1 | 1) => void;

  /** The Segment part reports the element the focus moves to. */
  registerSegmentElement: (
    type: DateSegmentType,
    getNode: () => ViewRef | undefined,
  ) => () => void;

  /** Increments a segment, wrapping at its maximum. */
  increment: (segment: DateSegment) => void;

  /** Decrements a segment, wrapping at its minimum. */
  decrement: (segment: DateSegment) => void;

  /** Increments a segment by a page (5 years, 2 months, 7 days, 15 minutes…). */
  incrementPage: (segment: DateSegment) => void;

  /** Decrements a segment by a page. */
  decrementPage: (segment: DateSegment) => void;

  /** Sets a segment to its maximum (Home / End on a spinbutton). */
  incrementToMax: (segment: DateSegment) => void;

  /** Sets a segment to its minimum. */
  decrementToMin: (segment: DateSegment) => void;

  /** Types one character into a segment, with React Aria's buffer and advance rules. */
  type: (segment: DateSegment, key: string) => void;

  /** Clears a segment, reverting it to its placeholder. */
  clear: (segment: DateSegment) => void;

  /** Commits the edited value on blur and runs validation. */
  commit: () => void;

  /** Formats the current value with extra options (React Stately's `formatValue`). */
  formatValue: (fieldOptions: Intl.DateTimeFormatOptions) => string;
}

const PAGE_STEP: Partial<Record<DateSegmentType, number>> = {
  year: 5,
  month: 2,
  day: 7,
  hour: 2,
  minute: 15,
  second: 15,
};

/* -------------------------------------------------------------------------------------------------
 * State
 * -----------------------------------------------------------------------------------------------*/

/**
 * Creates the state of one date or time field, the Solid counterpart of React
 * Stately's `useDateFieldState` (port sheet §5). It owns the value, the
 * `IncompleteDate` being edited, the formatted segments, the focused segment
 * and the typing buffer; it never touches an element object, only the element
 * getters the Segment parts register for `focusAdjacent`.
 */
export function createDateFieldState(
  props: CreateDateFieldStateProps = {},
): DateFieldState {
  const locale = computed(() => props.locale?.() ?? hostLocale());

  // The calendar system and hour cycle the display uses, resolved exactly as
  // React Stately resolves them from a short date+time formatter.
  const resolved = computed(() => {
    const hourCycleProp = props.hourCycle?.();
    const formatter = new DateFormatter(locale(), {
      dateStyle: "short",
      timeStyle: "short",
      hour12: hourCycleProp != null ? hourCycleProp === 12 : undefined,
    });
    const options = formatter.resolvedOptions();
    const createCalendar = props.createCalendar?.() ?? defaultCreateCalendar;

    return {
      calendar: createCalendar(options.calendar as CalendarIdentifier),
      hourCycle: options.hourCycle as HourCycle,
    };
  });

  const calendar = computed(() => resolved().calendar);

  // --- Value -----------------------------------------------------------------
  const initialValue = props.value?.() ?? props.defaultValue?.() ?? null;

  const [controlledValue, setControlledValue] = createControllableSignal<DateValue | null>({
    value: () => props.value?.(),
    defaultValue: () => props.defaultValue?.() ?? null,
    onChange: (next) => props.onChange?.(next),
  });
  const value = computed<DateValue | null>(() => controlledValue() ?? null);

  const isDisabled = () => props.isDisabled?.() === true;
  const isReadOnly = () => props.isReadOnly?.() === true;

  // React Stately keeps the last granularity and time zone when the value
  // becomes null; a plain module-local pair does the same without an extra
  // signal (`useDefaultProps`).
  let lastGranularity: Granularity =
    initialValue && "minute" in initialValue ? "minute" : "day";
  let lastTimeZone: string | undefined =
    initialValue && "timeZone" in initialValue ? initialValue.timeZone : undefined;

  effect(() => {
    const current = value();

    if (!current) {
      return;
    }

    lastGranularity = "minute" in current ? "minute" : "day";
    lastTimeZone = "timeZone" in current ? current.timeZone : undefined;
  });

  const granularity = computed<Granularity>(() => {
    const explicit = props.granularity?.();

    if (explicit) {
      return explicit;
    }

    const current = value();

    if (current) {
      return "minute" in current ? "minute" : "day";
    }

    return lastGranularity;
  });

  const defaultTimeZone = computed<string | undefined>(() => {
    const current = value();

    if (current) {
      return "timeZone" in current ? current.timeZone : undefined;
    }

    return lastTimeZone;
  });

  const calendarValue = computed(() => convertValue(value(), calendar()) ?? null);
  const originalCalendar = computed(() => value()?.calendar ?? new GregorianCalendar());

  const displaySegments = computed<DateSegmentType[]>(() => {
    const is12HourClock =
      resolved().hourCycle === "h11" || resolved().hourCycle === "h12";
    const order: DateSegmentType[] = [
      "era",
      "year",
      "month",
      "day",
      "hour",
      ...(is12HourClock ? (["dayPeriod"] as DateSegmentType[]) : []),
      "minute",
      "second",
    ];
    const minIndex = order.indexOf(props.maxGranularity?.() ?? "year");
    const maxIndex = order.indexOf(
      granularity() === "hour" && is12HourClock ? "dayPeriod" : granularity(),
    );

    return order.slice(minIndex, maxIndex + 1);
  });

  // --- Display value (the value being edited) -------------------------------
  const displayValue = signal(
    new IncompleteDate(resolved().calendar, resolved().hourCycle, calendarValue()),
  );

  // React Stately replaces the edited value when the value, the calendar or the
  // hour cycle changes; keep that bookkeeping outside the reactive graph.
  let lastDisplay = {
    value: calendarValue(),
    calendar: resolved().calendar,
    hourCycle: resolved().hourCycle,
  };

  effect(() => {
    const nextValue = calendarValue();
    const nextCalendar = resolved().calendar;
    const nextHourCycle = resolved().hourCycle;

    if (
      nextValue !== lastDisplay.value ||
      nextHourCycle !== lastDisplay.hourCycle ||
      !isEqualCalendar(nextCalendar, lastDisplay.calendar)
    ) {
      lastDisplay = {
        value: nextValue,
        calendar: nextCalendar,
        hourCycle: nextHourCycle,
      };
      displayValue.set(new IncompleteDate(nextCalendar, nextHourCycle, nextValue));
    }
  });

  const placeholder = computed(() =>
    createPlaceholderDate(
      props.placeholderValue?.(),
      granularity(),
      resolved().calendar,
      defaultTimeZone(),
    ),
  );

  // --- Formatting ------------------------------------------------------------
  const showEra = computed(
    () => resolved().calendar.identifier === "gregory" && displayValue().era === "BC",
  );

  const formatOptions = computed<FormatterOptions>(() => ({
    granularity: granularity(),
    maxGranularity: props.maxGranularity?.() ?? "year",
    timeZone: defaultTimeZone(),
    hideTimeZone: props.hideTimeZone?.(),
    hourCycle: props.hourCycle?.(),
    showEra: showEra(),
    shouldForceLeadingZeros: props.shouldForceLeadingZeros?.(),
  }));

  const intlOptions = computed(() => getFormatOptions({}, formatOptions()));
  const dateFormatter = computed<Intl.DateTimeFormat>(
    () => new DateFormatter(locale(), intlOptions()),
  );

  const dateValue = computed(() =>
    displayValue()
      .toValue(calendarValue() ?? placeholder())
      .toDate(defaultTimeZone() ?? "UTC"),
  );

  const segments = computed(() =>
    processSegments(
      dateValue(),
      displayValue(),
      dateFormatter(),
      dateFormatter().resolvedOptions(),
      resolved().calendar,
      locale(),
      granularity(),
    ),
  );

  // --- Editing ---------------------------------------------------------------
  const commitValue = (next: DateValue | IncompleteDate | null) => {
    if (isDisabled() || isReadOnly()) {
      return;
    }

    if (
      next == null ||
      (next instanceof IncompleteDate && next.isCleared(displaySegments()))
    ) {
      displayValue.set(new IncompleteDate(resolved().calendar, resolved().hourCycle, calendarValue()));
      setControlledValue(null);
    } else if (!(next instanceof IncompleteDate)) {
      // The display calendar must not affect the emitted value: emit in the
      // calendar of the original value, or Gregorian.
      displayValue.set(new IncompleteDate(resolved().calendar, resolved().hourCycle, calendarValue()));
      setControlledValue(toCalendar(next, originalCalendar()));
    } else if (next.isComplete(displaySegments())) {
      // A complete and valid value commits eagerly; an incomplete or invalid
      // one (February 30th) waits for the commit on blur.
      const complete = next.toValue(calendarValue() ?? placeholder());

      if (next.validate(complete, displaySegments())) {
        const newValue = toCalendar(complete, originalCalendar());

        if (!value() || newValue.compare(value()!) !== 0) {
          displayValue.set(new IncompleteDate(resolved().calendar, resolved().hourCycle, calendarValue()));
          setControlledValue(newValue);

          return;
        }
      }

      displayValue.set(next);
    } else {
      displayValue.set(next);
    }
  };

  const setValue = (next: DateValue | null) => {
    commitValue(next);
  };

  const adjust = (segment: DateSegment, amount: number) => {
    if (isDisabled() || isReadOnly() || !segment.isEditable) {
      return;
    }

    enteredKeys.clear();
    commitValue(displayValue().cycle(segment.type, amount, placeholder(), displaySegments()));
  };

  const setSegmentValue = (type: DateSegmentType, next: string | number) => {
    if (isDisabled() || isReadOnly()) {
      return;
    }

    commitValue(displayValue().set(type, next, placeholder()));
  };

  // --- Validation ------------------------------------------------------------
  const committedErrors = signal<readonly string[]>([]);
  let hasCommitted = false;

  const runValidation = () => {
    const current = value();
    const errors: string[] = [];
    const min = props.minValue?.();
    const max = props.maxValue?.();

    if (current) {
      if (min && current.compare(min) < 0) {
        errors.push("Date out of range");
      }

      if (max && current.compare(max) > 0) {
        errors.push("Date out of range");
      }

      if (props.isDateUnavailable?.()?.(current)) {
        errors.push("Date unavailable");
      }
    }

    const result = props.validate?.()?.(current);

    if (typeof result === "string") {
      errors.push(result);
    } else if (result && typeof result === "object" && typeof result.message === "string") {
      errors.push(result.message);
    }

    committedErrors.set(errors);
  };

  // After the first commit, every value change re-runs validation, as React
  // Aria's form validation state does.
  effect(() => {
    value();

    if (hasCommitted) {
      runValidation();
    }
  });

  const isInvalid = () => props.isInvalid?.() === true || committedErrors().length > 0;

  const commit = () => {
    if (isDisabled() || isReadOnly()) {
      return;
    }

    hasCommitted = true;
    runValidation();

    const display = displayValue();

    if (!display.isComplete(displaySegments())) {
      return;
    }

    const complete = display.toValue(calendarValue() ?? placeholder());
    const newValue = toCalendar(complete, originalCalendar());

    if (!value() || newValue.compare(value()!) !== 0) {
      setControlledValue(newValue);
    }

    displayValue.set(
      new IncompleteDate(
        resolved().calendar,
        resolved().hourCycle,
        convertValue(newValue, resolved().calendar) ?? null,
      ),
    );
    enteredKeys.clear();
  };

  // --- Focus -----------------------------------------------------------------
  const focused = signal<DateSegment | null>(null);
  const segmentNodes = new Map<DateSegmentType, () => ViewRef | undefined>();

  const focusedSegment = () => focused();

  const focusSegment = (segment: DateSegment | null) => {
    enteredKeys.clear();
    focused.set(segment);
  };

  const registerSegmentElement = (
    type: DateSegmentType,
    getNode: () => ViewRef | undefined,
  ) => {
    segmentNodes.set(type, getNode);

    return () => {
      if (segmentNodes.get(type) === getNode) {
        segmentNodes.delete(type);
      }
    };
  };

  const focusAdjacent = (direction: -1 | 1) => {
    const editable = segments().filter((segment) => segment.isEditable);

    if (editable.length === 0) {
      return;
    }

    const current = focused();
    const index = current ? editable.findIndex((segment) => segment.type === current.type) : -1;
    const nextIndex =
      index < 0 ? (direction > 0 ? 0 : editable.length - 1) : index + direction;

    if (nextIndex < 0 || nextIndex >= editable.length) {
      return;
    }

    segmentNodes.get(editable[nextIndex].type)?.()?.focus();
  };

  // --- Typing ----------------------------------------------------------------
  const enteredKeys = new Map<DateSegmentType, string>();
  const parser = computed(() => new NumberParser(locale(), { maximumFractionDigits: 0 }));

  const amPmNames = computed(() => {
    const formatter = new DateFormatter(locale(), { hour: "numeric", hour12: true });
    const read = (hours: number, fallback: string) => {
      const date = new Date();

      date.setHours(hours);

      return formatter.formatToParts(date).find((part) => part.type === "dayPeriod")?.value ?? fallback;
    };

    return { am: read(0, "AM"), pm: read(12, "PM") };
  });

  const eraNames = () => {
    const formatter = new DateFormatter(locale(), {
      year: "numeric",
      era: "narrow",
      timeZone: "UTC",
    });
    const base = toCalendar(new CalendarDate(1, 1, 1), resolved().calendar);
    const eras = resolved()
      .calendar.getEras()
      .map((era) => {
        const date = base.set({ year: 1, month: 1, day: 1, era }).toDate("UTC");
        const formatted = formatter.formatToParts(date).find((part) => part.type === "era")?.value ?? era;

        return { era, formatted };
      });
    const prefixLength = commonPrefixLength(eras.map((entry) => entry.formatted));

    if (prefixLength) {
      for (const entry of eras) {
        entry.formatted = entry.formatted.slice(prefixLength);
      }
    }

    return eras;
  };

  const typeKey = (segment: DateSegment, key: string) => {
    if (isDisabled() || isReadOnly() || !segment.isEditable) {
      return;
    }

    const buffer = (enteredKeys.get(segment.type) ?? "") + key;

    switch (segment.type) {
      case "dayPeriod": {
        const names = amPmNames();

        if (startsWith(names.am, key)) {
          setSegmentValue("dayPeriod", 0);
        } else if (startsWith(names.pm, key)) {
          setSegmentValue("dayPeriod", 1);
        } else {
          return;
        }

        enteredKeys.delete(segment.type);
        focusAdjacent(1);
        break;
      }
      case "era": {
        const matched = eraNames().find((entry) => startsWith(entry.formatted, key));

        if (matched) {
          setSegmentValue("era", matched.era);
          enteredKeys.delete(segment.type);
          focusAdjacent(1);
        }
        break;
      }
      default: {
        if (!parser().isValidPartialNumber(buffer)) {
          return;
        }

        const numberValue = parser().parse(buffer);
        let segmentValue = numberValue;

        if (segment.maxValue !== undefined && numberValue > segment.maxValue) {
          segmentValue = parser().parse(key);
        }

        if (Number.isNaN(numberValue) || Number.isNaN(segmentValue)) {
          return;
        }

        setSegmentValue(segment.type, segmentValue);

        if (
          segment.maxValue !== undefined &&
          (Number(`${numberValue}0`) > segment.maxValue ||
            buffer.length >= String(segment.maxValue).length)
        ) {
          enteredKeys.delete(segment.type);
          focusAdjacent(1);
        } else {
          enteredKeys.set(segment.type, buffer);
        }
      }
    }
  };

  // React Stately's spinbutton page steps and the Home / End jumps, kept so the
  // consuming DateField unit can bind them without re-deriving the rules.
  const page = (segment: DateSegment, direction: 1 | -1) => {
    if (isDisabled() || isReadOnly() || !segment.isEditable) {
      return;
    }

    enteredKeys.clear();
    commitValue(
      displayValue().cycle(
        segment.type,
        direction * (PAGE_STEP[segment.type] ?? 1),
        placeholder(),
        displaySegments(),
      ),
    );
  };

  const toLimit = (segment: DateSegment, direction: 1 | -1) => {
    if (isDisabled() || isReadOnly() || !segment.isEditable) {
      return;
    }

    enteredKeys.clear();

    const limits = displayValue().getSegmentLimits(segment.type);

    if (!limits) {
      return;
    }

    const limit =
      segment.type === "hour" && resolved().hourCycle === "h12"
        ? direction > 0
          ? 11
          : 12
        : direction > 0
          ? limits.maxValue
          : limits.minValue;

    commitValue(displayValue().set(segment.type, limit, placeholder()));
  };

  return {
    value: calendarValue,
    setValue,
    calendar: originalCalendar,
    dateValue,
    dateFormatter,
    segments: () => segments(),
    isDisabled,
    isReadOnly,
    isRequired: () => props.isRequired?.() === true,
    isInvalid,
    validationErrors: committedErrors,
    focusedSegment,
    focusSegment,
    focusAdjacent,
    registerSegmentElement,
    increment: (segment) => adjust(segment, 1),
    decrement: (segment) => adjust(segment, -1),
    incrementPage: (segment) => page(segment, 1),
    decrementPage: (segment) => page(segment, -1),
    incrementToMax: (segment) => toLimit(segment, 1),
    decrementToMin: (segment) => toLimit(segment, -1),
    type: typeKey,
    clear: (segment) => {
      if (isDisabled() || isReadOnly() || !segment.isEditable) {
        return;
      }

      enteredKeys.delete(segment.type);
      commitValue(displayValue().clear(segment.type));
    },
    commit,
    formatValue: (fieldOptions) => {
      if (!calendarValue()) {
        return "";
      }

      const options = getFormatOptions(fieldOptions, formatOptions());
      const formatter = new DateFormatter(locale(), options);

      return formatter.format(dateValue());
    },
  };
}

/* -------------------------------------------------------------------------------------------------
 * Helpers
 * -----------------------------------------------------------------------------------------------*/

function startsWith(text: string, prefix: string): boolean {
  return text.toLowerCase().startsWith(prefix.toLowerCase());
}

function commonPrefixLength(strings: string[]): number {
  const sorted = [...strings].sort();
  const first = sorted[0];
  const last = sorted[sorted.length - 1];

  if (!first || !last) {
    return 0;
  }

  for (let index = 0; index < first.length; index++) {
    if (first[index] !== last[index]) {
      return index;
    }
  }

  return 0;
}
