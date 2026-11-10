import type { Accessor } from "nsh";
import { computed, locale as hostLocale } from "nsh";
import type { DateValue, ZonedDateTime } from "@internationalized/date";
import { getLocalTimeZone, Time, toCalendarDateTime, today } from "@internationalized/date";

import type {
  DateFieldState,
  DateFieldValidationError,
} from "../date-input-group/create-date-field-state";
import { createDateFieldState } from "../date-input-group/create-date-field-state";
import type { Granularity } from "../date-input-group/date-field-utils";

/**
 * The value of a `TimeField`: a wall-clock `Time`, or a `ZonedDateTime` when the
 * value carries a time zone. React Aria Components defines this alias inside
 * `react-aria-components/TimeField` and does not export it from HeroUI's entry
 * either, so the package entry does not export it here either (port sheet §1.1).
 */
export type TimeValue = Time | ZonedDateTime;

/** The smallest unit a TimeField displays; a time has no day or larger segment. */
export type TimeFieldGranularity = "hour" | "minute" | "second";

/**
 * The inputs of `createTimeFieldState`: React Stately's
 * `TimeFieldStateOptions` with accessors (D16). The value-bearing members are
 * `TimeValue`s, exactly as the public root receives them; the state adapts them
 * to the `DateValue` channel of `createDateFieldState` (port sheet §5).
 */
export interface CreateTimeFieldStateProps {
  /** The value, controlled. `undefined` makes the field uncontrolled. */
  value?: Accessor<TimeValue | null | undefined>;

  /** The initial value, uncontrolled. */
  defaultValue?: Accessor<TimeValue | null | undefined>;

  /** Called with every value the field commits, in the public `TimeValue` shape. */
  onChange?: (value: TimeValue | null) => void;

  /** The time the empty segments show, converted to the reference day. */
  placeholderValue?: Accessor<TimeValue | null | undefined>;

  /** The earliest allowed time. */
  minValue?: Accessor<TimeValue | null | undefined>;

  /** The latest allowed time. */
  maxValue?: Accessor<TimeValue | null | undefined>;

  /** The smallest displayed unit; `"minute"` by default. */
  granularity?: Accessor<TimeFieldGranularity | undefined>;

  /** 12 or 24 hour display; the locale decides when absent. */
  hourCycle?: Accessor<12 | 24 | undefined>;

  /** Hides the time zone abbreviation of a zoned value. */
  hideTimeZone?: Accessor<boolean | undefined>;

  /** Forces leading zeros in the hour segment. */
  shouldForceLeadingZeros?: Accessor<boolean | undefined>;

  /** The locale the segments are formatted and edited in (default: the host's). */
  locale?: Accessor<string | undefined>;

  /** Blocks editing and dims the segments. */
  isDisabled?: Accessor<boolean | undefined>;

  /** Keeps the segments focusable and blocks the value change. */
  isReadOnly?: Accessor<boolean | undefined>;

  /** Marks the field required; the visible asterisk belongs to the Label. */
  isRequired?: Accessor<boolean | undefined>;

  /** Marks the field invalid whatever validation says. */
  isInvalid?: Accessor<boolean | undefined>;

  /** Runs at commit; `true` means valid, a string or `{ message }` is the error. */
  validate?: Accessor<
    | ((value: TimeValue) => true | string | DateFieldValidationError | null | undefined)
    | undefined
  >;
}

/**
 * The state one TimeField owns: React Stately's `DateFieldState` (what RAC's
 * `DateFieldRenderProps.state` carries upstream) plus the field's value in the
 * public `TimeValue` shape.
 */
export interface TimeFieldState extends DateFieldState {
  /** The committed value as `Time` (no time zone) or the original `ZonedDateTime`. */
  timeValue: Accessor<TimeValue | null>;
}

/**
 * Turns a public time value into the `DateValue` `createDateFieldState` edits.
 *
 * A `Time` has no calendar, so `convertValue` would call `toCalendar` on it and
 * throw (`date-field-utils.ts:156-169`). Both directions are bridged here: a
 * plain `Time` rides on a reference day, a `ZonedDateTime` passes through
 * untouched (it is already a `DateValue`). React Stately's `useTimeFieldState`
 * makes the same move through `toCalendarDateTime(today(timeZone), value)`.
 */
export function toTimeFieldInternalValue(
  value: TimeValue | null | undefined,
  referenceDay: DateValue,
): DateValue | null | undefined {
  if (value === null) {
    return null;
  }

  if (value === undefined) {
    return undefined;
  }

  if ("timeZone" in value) {
    return value;
  }

  return toCalendarDateTime(referenceDay, value);
}

/** Turns an internal value back into the public `TimeValue` shape. */
export function fromTimeFieldInternalValue(value: DateValue | null): TimeValue | null {
  if (!value) {
    return null;
  }

  if ("timeZone" in value) {
    return value as ZonedDateTime;
  }

  // A TimeField's state always holds a time (its `granularity` is never
  // `"day"`), so the hour check only narrows the `DateValue` union: a bare
  // `CalendarDate` cannot reach here.
  if ("hour" in value) {
    return new Time(value.hour, value.minute, value.second, value.millisecond);
  }

  return new Time(0, 0);
}

/**
 * Creates the state of one TimeField (port sheet §2, §5).
 *
 * It is a thin adapter: the segments, the editing buffer, the focus and the
 * validation all belong to `createDateFieldState` (b04). What this adds is the
 * `TimeValue` <-> `DateValue` bridge on the way in and out, and the two
 * defaults React Stately's `useTimeFieldState` applies: `granularity`
 * `"minute"` and `maxGranularity` `"hour"` — the latter is what stops the
 * segment list at the hour instead of starting at the year
 * (`date-field-utils.ts:116-133`).
 *
 * The reference day is taken once, at creation: a plain `Time` needs some day
 * to live on, and no segment displays it, so it never reaches the user.
 */
export function createTimeFieldState(props: CreateTimeFieldStateProps = {}): TimeFieldState {
  const referenceDay: DateValue = today(getLocalTimeZone());

  const state = createDateFieldState({
    value: () => toTimeFieldInternalValue(props.value?.(), referenceDay),
    defaultValue: () => toTimeFieldInternalValue(props.defaultValue?.(), referenceDay),
    onChange: (value) => props.onChange?.(fromTimeFieldInternalValue(value)),
    placeholderValue: () => toTimeFieldInternalValue(props.placeholderValue?.(), referenceDay),
    minValue: () => toTimeFieldInternalValue(props.minValue?.(), referenceDay),
    maxValue: () => toTimeFieldInternalValue(props.maxValue?.(), referenceDay),
    // The two defaults `useTimeFieldState` adds on top of the date state.
    granularity: () => (props.granularity?.() ?? "minute") as Granularity,
    maxGranularity: () => "hour",
    hourCycle: () => props.hourCycle?.(),
    hideTimeZone: () => props.hideTimeZone?.(),
    shouldForceLeadingZeros: () => props.shouldForceLeadingZeros?.(),
    locale: () => props.locale?.() ?? hostLocale(),
    isDisabled: () => props.isDisabled?.(),
    isReadOnly: () => props.isReadOnly?.(),
    isRequired: () => props.isRequired?.(),
    isInvalid: () => props.isInvalid?.(),
    validate: () => {
      const validate = props.validate?.();

      if (!validate) {
        return undefined;
      }

      // `DateFieldState` runs `validate` with a null value too (React Stately
      // does not); a time field's `validate` never sees null upstream, so the
      // bridge skips it and leaves "no value" to the field's completeness check.
      return (value) => {
        const time = fromTimeFieldInternalValue(value);

        return time ? validate(time) : undefined;
      };
    },
  });

  const timeValue = computed(() => fromTimeFieldInternalValue(state.value()));

  return { ...state, timeValue };
}
