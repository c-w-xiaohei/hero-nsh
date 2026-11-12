import type { Accessor } from "nsh";
import { computed, locale as hostLocale } from "nsh";
import type { Calendar, CalendarIdentifier, CalendarDate, DateValue } from "@internationalized/date";
import { createCalendar as createCalendarDefault } from "@internationalized/date";

import { createControllableSignal } from "../../primitives/create-controllable-signal";
import {
  createDateFieldState,
  type CreateDateFieldStateProps,
  type DateFieldState,
  type DateFieldValidationError,
} from "../date-input-group/create-date-field-state";
import type { Granularity, MaxGranularity } from "../date-input-group/date-field-utils";

/** HeroUI's `RangeValue<DateValue>`: the two ends of a selected range. */
export interface DateRangeValue<T extends DateValue = DateValue> {
  start: T;
  end: T;
}

/**
 * The options of `createDateRangeFieldState`: the picker's `value` /
 * `defaultValue` / `onChange` pair plus every field option React Stately's
 * `createDateRangeFieldState` hands its two `useDateFieldState` calls, as
 * accessors (port sheet §2, §5).
 */
export interface CreateDateRangeFieldStateProps {
  /** The range, controlled. `undefined` makes the picker uncontrolled. */
  value?: Accessor<DateRangeValue | null | undefined>;

  /** The initial range, uncontrolled. */
  defaultValue?: Accessor<DateRangeValue | null | undefined>;

  /** Called with every range change: a calendar pick or a committed segment edit. */
  onChange?: (value: DateRangeValue | null) => void;

  /** The date the empty segments show. */
  placeholderValue?: Accessor<DateValue | null | undefined>;

  /** The smallest displayed unit. */
  granularity?: Accessor<Granularity | undefined>;

  /** The largest displayed unit. */
  maxGranularity?: Accessor<MaxGranularity | undefined>;

  /** 12 or 24 hour display; the locale decides when absent. */
  hourCycle?: Accessor<12 | 24 | undefined>;

  /** Hides the time zone abbreviation of a zoned value. */
  hideTimeZone?: Accessor<boolean | undefined>;

  /** Forces leading zeros. */
  shouldForceLeadingZeros?: Accessor<boolean | undefined>;

  /** The earliest allowed date, for both fields. */
  minValue?: Accessor<DateValue | null | undefined>;

  /** The latest allowed date, for both fields. */
  maxValue?: Accessor<DateValue | null | undefined>;

  /**
   * Marks a day the user may not pick, with the range's other end as the
   * second argument; a field state only ever asks about one day, so it gets
   * `null` there (port sheet §1.2).
   */
  isDateUnavailable?: Accessor<
    ((date: DateValue, anchorDate: CalendarDate | null) => boolean) | undefined
  >;

  /** Builds the calendar system both fields display. */
  createCalendar?: Accessor<((name: CalendarIdentifier) => Calendar) | undefined>;

  /** The locale both fields are formatted and edited in. */
  locale?: Accessor<string | undefined>;

  /** Runs on every commit of either field; `true` when valid, else the message. */
  validate?: Accessor<
    | ((value: DateRangeValue | null) => true | string | DateFieldValidationError | null | undefined)
    | undefined
  >;

  /** Blocks editing and dims both fields. */
  isDisabled?: Accessor<boolean | undefined>;

  /** Keeps both fields focusable and blocks the value change. */
  isReadOnly?: Accessor<boolean | undefined>;

  /** Marks the range required. */
  isRequired?: Accessor<boolean | undefined>;

  /** Marks the range invalid whatever validation says. */
  isInvalid?: Accessor<boolean | undefined>;
}

/**
 * A range field's state: React Stately's `createDateRangeFieldState`
 * (`@react-stately/datepicker/src/useDateRangeFieldState.ts`), which owns one
 * range value and derives two ordinary `useDateFieldState`s from it, each
 * writing its own side back.
 *
 * `field` is the handle a group and its parts read: the single
 * `DateInputGroupFieldContext` slot with slot-aware readers (port sheet §2 and
 * §5, third change), plus `forSlot` so a part can bind itself to one real
 * state.
 */
export interface DateRangeFieldState {
  /** The slot-aware handle a group and the picker's render props read. */
  field: DateFieldState;

  /** The start field's own state. */
  start: DateFieldState;

  /** The end field's own state. */
  end: DateFieldState;

  /** The selected range, controlled or not. */
  range: Accessor<DateRangeValue | null>;

  /** Sets the range, keeping `start` at or before `end` as upstream does. */
  setRange: (next: DateRangeValue | null) => void;
}

/**
 * Creates the state of one date range field: one controlled range value plus
 * the two field states derived from it.
 *
 * Both sides share every field option; only the value they read and the side
 * they write back differ. A side that commits before the other exists fills
 * the missing end with itself, which is how React Stately keeps a range
 * half-edited.
 */
export function createDateRangeFieldState(
  props: CreateDateRangeFieldStateProps = {},
): DateRangeFieldState {
  const [range, setControlledRange] = createControllableSignal<DateRangeValue | null>({
    value: () => props.value?.(),
    defaultValue: () => props.defaultValue?.() ?? null,
    onChange: (next) => props.onChange?.(next ?? null),
  });

  /** `start > end` swaps the ends, the rule `createRangeCalendarState.setValue` applies. */
  const order = (next: DateRangeValue): DateRangeValue =>
    next.start.compare(next.end) > 0 ? { start: next.end, end: next.start } : next;

  const setRange = (next: DateRangeValue | null) => {
    setControlledRange(next ? order(next) : null);
  };

  /** The public read: an absent uncontrolled value is `null`, as upstream. */
  const rangeValue = computed<DateRangeValue | null>(() => range() ?? null);

  // One adapter, not one per read: a field state calls this on every day it
  // paints, and a fresh function identity each time would churn its computeds.
  // The second argument is the range's anchor, which a field state never has
  // (port sheet §1.2, §8 item 7).
  const unavailableDay = (date: DateValue): boolean =>
    props.isDateUnavailable?.()?.(date, null) ?? false;

  // One commit of one side is validated against the range it belongs to: the
  // picker's `validate` takes the whole selection, while a field state only
  // knows the value it just committed (port sheet §1.2).
  const validateRange = (
    value: DateValue | null,
  ): true | string | DateFieldValidationError | null | undefined => {
    const validate = props.validate?.();

    if (!validate) {
      return true;
    }

    const current = range();

    if (current) {
      return validate(current);
    }

    return validate(value ? { start: value, end: value } : null);
  };

  const fieldOptions: Omit<
    CreateDateFieldStateProps,
    "value" | "defaultValue" | "onChange"
  > = {
    placeholderValue: () => props.placeholderValue?.(),
    granularity: () => props.granularity?.(),
    maxGranularity: () => props.maxGranularity?.(),
    hourCycle: () => props.hourCycle?.(),
    hideTimeZone: () => props.hideTimeZone?.(),
    shouldForceLeadingZeros: () => props.shouldForceLeadingZeros?.(),
    minValue: () => props.minValue?.(),
    maxValue: () => props.maxValue?.(),
    isDateUnavailable: () => (props.isDateUnavailable?.() ? unavailableDay : undefined),
    createCalendar: () => props.createCalendar?.() ?? createCalendarDefault,
    locale: () => props.locale?.() ?? hostLocale(),
    validate: () => (props.validate?.() ? validateRange : undefined),
    isDisabled: () => props.isDisabled?.(),
    isReadOnly: () => props.isReadOnly?.(),
    isRequired: () => props.isRequired?.(),
    isInvalid: () => props.isInvalid?.(),
  };

  // Each side writes its own end back: editing the start keeps the current end
  // and fills it with the new start when the range had none (React Stately's
  // `startState` / `endState` `onChange`).
  const start = createDateFieldState({
    ...fieldOptions,
    value: () => rangeValue()?.start ?? null,
    onChange: (next) => {
      if (!next) {
        setRange(null);

        return;
      }

      setRange({ start: next, end: rangeValue()?.end ?? next });
    },
  });

  const end = createDateFieldState({
    ...fieldOptions,
    value: () => rangeValue()?.end ?? null,
    onChange: (next) => {
      if (!next) {
        setRange(null);

        return;
      }

      setRange({ start: rangeValue()?.start ?? next, end: next });
    },
  });

  const pick = (slot: string | undefined): DateFieldState => (slot === "end" ? end : start);

  // The group's own readers ask without a slot: an invalid side makes the pair
  // invalid, and the messages of both sides are the field's (port sheet §2).
  const validationErrors = computed<readonly string[]>(() => [
    ...start.validationErrors(),
    ...end.validationErrors(),
  ]);

  const field: DateFieldState = {
    value: () => start.value(),
    setValue: (next) => start.setValue(next),
    calendar: start.calendar,
    dateValue: start.dateValue,
    dateFormatter: start.dateFormatter,
    segments: (slot) => pick(slot).segments(),
    isDisabled: (slot) => pick(slot).isDisabled(),
    isReadOnly: (slot) => pick(slot).isReadOnly(),
    isRequired: (slot) => pick(slot).isRequired(),
    isInvalid: (slot) =>
      slot === undefined ? start.isInvalid() || end.isInvalid() : pick(slot).isInvalid(),
    validationErrors,
    focusedSegment: (slot) => pick(slot).focusedSegment(),
    // A segment reports itself through the real state it was given (the Input
    // hands it `forSlot`); the handle's own call clears both sides.
    focusSegment: (segment) => {
      if (segment === null) {
        start.focusSegment(null);
        end.focusSegment(null);

        return;
      }

      const belongsToStart = start.segments().some((candidate) => candidate === segment);

      (belongsToStart ? start : end).focusSegment(segment);
    },
    focusAdjacent: (direction) => start.focusAdjacent(direction),
    focusLast: () => start.focusLast(),
    registerSegmentElement: (type, getNode) => start.registerSegmentElement(type, getNode),
    increment: (segment) => start.increment(segment),
    decrement: (segment) => start.decrement(segment),
    incrementPage: (segment) => start.incrementPage(segment),
    decrementPage: (segment) => start.decrementPage(segment),
    incrementToMax: (segment) => start.incrementToMax(segment),
    decrementToMin: (segment) => start.decrementToMin(segment),
    type: (segment, key) => start.type(segment, key),
    backspace: (segment) => start.backspace(segment),
    clear: (segment) => start.clear(segment),
    // The group commits when the focus leaves either side.
    commit: () => {
      start.commit();
      end.commit();
    },
    formatValue: (fieldOptionsValue) => start.formatValue(fieldOptionsValue),
    forSlot: (slot) => pick(slot),
  };

  return { field, start, end, range: rangeValue, setRange };
}
