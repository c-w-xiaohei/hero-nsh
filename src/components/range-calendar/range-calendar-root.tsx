import type { Bounds, JSX, ViewProps, ViewRef } from "nsh";
import { cleanup, computed, locale as hostLocale, signal, split, View } from "nsh";
import type {
  Calendar,
  CalendarDate,
  CalendarIdentifier,
  DateDuration,
  DateValue,
} from "@internationalized/date";

import { createControllableBooleanSignal } from "../../primitives/create-controllable-signal";
import { renderChildren } from "../calendar/children";
import {
  CalendarDefaultsContext,
  CalendarGridLayoutContext,
  CalendarOrRangeStateContext,
} from "../calendar/calendar-context";
import type { CalendarPageBehavior, CalendarWeeksInMonth } from "../calendar/create-calendar-state";
import type { FirstDayOfWeek } from "../calendar/date-utils";
import { YearPickerContext, type YearPickerContextValue } from "../calendar/year-picker-context";
import type { RangeCalendarSelectionAlignment } from "./create-range-calendar-state";
import { createRangeCalendarState } from "./create-range-calendar-state";
import type { RangeCalendarValue } from "./create-range-calendar-state";
import {
  RangeCalendarContext,
  type RangeCalendarRenderProps,
} from "./range-calendar-context";
import { rangeCalendarVariants } from "./range-calendar.styles";

/**
 * The locale's reading direction, with a language fallback for hosts whose
 * `Intl.Locale` lacks `textInfo`. Same helper as `calendar/calendar-root.tsx`
 * (a local copy: lifting it into `src/primitives/` is a separate refactor every
 * date unit would collide on, _common "New shared code").
 */
function localeDirection(locale: string): "ltr" | "rtl" {
  try {
    const info = (new Intl.Locale(locale) as { textInfo?: { direction?: string } }).textInfo;
    if (info?.direction) return info.direction === "rtl" ? "rtl" : "ltr";
  } catch {
    // Fall through to the language list.
  }
  const language = locale.split("-")[0]?.toLowerCase() ?? "";
  return ["ar", "he", "fa", "ur", "ps", "sd", "ug", "ckb", "ku"].includes(language) ? "rtl" : "ltr";
}

export interface RangeCalendarRootProps extends Omit<ViewProps, "children" | "class" | "ref"> {
  /** Nodes, or a function called once with the calendar's state accessors. */
  children?: JSX.Element | ((values: RangeCalendarRenderProps) => JSX.Element);

  /** Appended after the root slot classes; later classes win. */
  className?: string;

  /** The selected range (two dates). Controlled. */
  value?: RangeCalendarValue<DateValue> | null;

  /** The initial range, uncontrolled. @default null */
  defaultValue?: RangeCalendarValue<DateValue> | null;

  /** Called with the new range. */
  onChange?: (value: RangeCalendarValue<DateValue>) => void;

  /** The date that has keyboard focus; it is also the range's other end while
   * a selection is in progress. Controlled. */
  focusedValue?: DateValue | null;

  /** The initial focused date, uncontrolled. */
  defaultFocusedValue?: DateValue | null;

  /** Called when the focused date moves. */
  onFocusChange?: (date: CalendarDate) => void;

  /** The earliest selectable date. */
  minValue?: DateValue | null;

  /** The latest selectable date. */
  maxValue?: DateValue | null;

  /** How much time the calendar shows at once. @default { months: 1 } */
  visibleDuration?: DateDuration;

  /** The day the week starts on; the locale decides when absent. */
  firstDayOfWeek?: FirstDayOfWeek;

  /** Whether a page key moves one visible page or one unit. @default "visible" */
  pageBehavior?: CalendarPageBehavior;

  /** How the initial window lines up with the selection. @default "start" */
  selectionAlignment?: RangeCalendarSelectionAlignment;

  /** Weeks per month row: a number, or `single` / `double` / `all`. */
  weeksInMonth?: CalendarWeeksInMonth;

  /** Lets a range hold dates the user cannot pick. @default false */
  allowsNonContiguousRanges?: boolean;

  /** Keeps at least one range selected. @default false */
  disallowEmptySelection?: boolean;

  /** Disables the whole calendar. */
  isDisabled?: boolean;

  /** Keeps the calendar focusable but unchanged by the user. */
  isReadOnly?: boolean;

  /** Marks days the user may not pick; the range's other end arrives as the
   * second argument, as upstream's range mode does. */
  isDateUnavailable?: (date: DateValue, anchorDate: CalendarDate | null) => boolean;

  /** Focuses the focused date after mount (web and macOS; port sheet §8). */
  autoFocus?: boolean;

  /** Builds the calendar for an identifier; defaults to `@internationalized/date`. */
  createCalendar?: (name: CalendarIdentifier) => Calendar;

  /** The locale the labels are formatted in (default: the host's). */
  locale?: string;

  /** The year picker's open state, controlled. */
  isYearPickerOpen?: boolean;

  /** The initial year picker open state, uncontrolled. */
  defaultYearPickerOpen?: boolean;

  /** Called when the year picker opens or closes. */
  onYearPickerOpenChange?: (isOpen: boolean) => void;

  /** The calendar's accessible name; the grid's name is this plus the range. */
  "aria-label"?: string;

  /** Accepted, no effect: NSH has no cross-element references. */
  "aria-labelledby"?: string;

  /** The root's ref, forwarded as a callback. */
  ref?: (node: ViewRef) => void;
}

/**
 * `RangeCalendar.Root`: HeroUI 3.2.7's `RangeCalendarRoot`. It owns the range
 * state, provides it to every part, and provides the `YearPickerContext` the
 * year panel reads (with the range calendar's own `calendarGridSlot`).
 *
 * Range mode is the only selection mode upstream has, so there is no
 * `selectionMode` prop (port sheet §1.2).
 */
export function RangeCalendarRoot(props: RangeCalendarRootProps): JSX.Element {
  const [local, rest] = split(props, [
    "children",
    "className",
    "value",
    "defaultValue",
    "onChange",
    "focusedValue",
    "defaultFocusedValue",
    "onFocusChange",
    "minValue",
    "maxValue",
    "visibleDuration",
    "firstDayOfWeek",
    "pageBehavior",
    "selectionAlignment",
    "weeksInMonth",
    "allowsNonContiguousRanges",
    "disallowEmptySelection",
    "isDisabled",
    "isReadOnly",
    "isDateUnavailable",
    "autoFocus",
    "createCalendar",
    "locale",
    "isYearPickerOpen",
    "defaultYearPickerOpen",
    "onYearPickerOpenChange",
    "aria-label",
    "aria-labelledby",
    "ref",
  ]);

  const locale = local.locale ?? hostLocale();

  // What an enclosing DatePicker / DateRangePicker hands down (port sheet §5,
  // first cross-unit change): React Aria merges `calendarProps` into the
  // calendar's own props with `useContextProps`, where the explicit prop wins.
  // A range calendar outside such a picker reads `undefined` and behaves as
  // before.
  const defaults = CalendarDefaultsContext();

  const fallback = <T,>(
    own: T | undefined,
    read: (() => T | undefined) | undefined,
  ): T | undefined => (own !== undefined ? own : read?.());

  // A range picker hands its selection over as the pair HeroUI's
  // `calendarProps.value` carries; anything that is not a pair leaves this
  // calendar uncontrolled, so an empty picker lets the calendar own the range
  // it paints.
  const defaultsRange = (): RangeCalendarValue<DateValue> | null | undefined => {
    const value = defaults?.value?.();

    if (!Array.isArray(value) || value.length < 2) {
      return undefined;
    }

    return { start: value[0]!, end: value[1]! };
  };

  const state = createRangeCalendarState({
    locale,
    createCalendar: fallback(local.createCalendar, defaults?.createCalendar),
    // `value` is the one input the range state keeps reading after it is
    // created (`createControllableSignal` reads it through an accessor), so it
    // stays a getter: a picker-driven calendar follows the picker's range
    // instead of a copy taken at mount.
    get value() {
      return fallback(local.value, defaultsRange);
    },
    defaultValue: local.defaultValue,
    onChange:
      local.onChange ??
      (defaults?.onChange
        ? (range: RangeCalendarValue<DateValue>) =>
            defaults.onChange?.([range.start, range.end])
        : undefined),
    focusedValue: local.focusedValue,
    defaultFocusedValue: fallback(local.defaultFocusedValue, defaults?.defaultFocusedValue),
    onFocusChange: local.onFocusChange,
    minValue: fallback(local.minValue, defaults?.minValue),
    maxValue: fallback(local.maxValue, defaults?.maxValue),
    visibleDuration: local.visibleDuration,
    firstDayOfWeek: local.firstDayOfWeek,
    pageBehavior: local.pageBehavior,
    selectionAlignment: local.selectionAlignment,
    weeksInMonth: local.weeksInMonth,
    allowsNonContiguousRanges: fallback(
      local.allowsNonContiguousRanges,
      defaults?.allowsNonContiguousRanges,
    ),
    disallowEmptySelection: local.disallowEmptySelection,
    isDisabled: fallback(local.isDisabled, defaults?.isDisabled),
    isReadOnly: fallback(local.isReadOnly, defaults?.isReadOnly),
    isDateUnavailable: fallback(local.isDateUnavailable, defaults?.isDateUnavailable),
    autoFocus: fallback(local.autoFocus, defaults?.autoFocus),
  });

  // §5, second cross-unit change: an enclosing picker closes its layer on the
  // press that completes a range, so it has to know whether this calendar is
  // between its two presses.
  if (defaults?.registerSelectionInProgress) {
    cleanup(
      defaults.registerSelectionInProgress(() => state.anchorDate() != null),
    );
  }

  const [isYearPickerOpen, setIsYearPickerOpen] = createControllableBooleanSignal({
    value: () => local.isYearPickerOpen,
    defaultValue: () => local.defaultYearPickerOpen ?? false,
    onChange: (next) => local.onYearPickerOpenChange?.(next),
  });

  // The year panel covers the grid with the bounds the grid reports (§2.3).
  const gridBounds = signal<Bounds | undefined>(undefined);
  const slots = rangeCalendarVariants();

  const calendarRef = (next: ViewRef) => {
    local.ref?.(next);
  };

  const yearPicker: YearPickerContextValue = {
    isYearPickerOpen,
    setIsYearPickerOpen,
    calendarRef,
    calendarGridSlot: "range-calendar-grid",
  };

  const ariaLabel = () => local["aria-label"];
  const direction = computed(() => localeDirection(locale));

  const renderValues: RangeCalendarRenderProps = {
    state,
    isDisabled: () => state.isDisabled,
    isInvalid: state.isValueInvalid,
  };

  const classValue = () => `${slots.base()} ${local.className ?? ""}`;

  // React Aria's `ChildrenOrFunction`: a function that declares a parameter is
  // the render-prop form and gets the render values; a zero-argument function
  // is a reactive child (research 4.1, 4.5). The single read of the children
  // prop happens at its placement, inside every provider (the context
  // exception of _common's component rules), so a `computed` would lose them.
  const resolveChildren = (children: RangeCalendarRootProps["children"]) => {
    if (typeof children === "function") {
      const fn = children as (values?: RangeCalendarRenderProps) => JSX.Element;
      return renderChildren(fn.length > 0 ? fn(renderValues) : fn());
    }
    return renderChildren(children as JSX.Element);
  };

  return (
    <RangeCalendarContext.Provider
      value={{ state, slots, ariaLabel, direction, isYearPickerOpen }}
    >
      <YearPickerContext.Provider value={yearPicker}>
        <CalendarGridLayoutContext.Provider
          value={{ bounds: gridBounds, setBounds: (bounds) => gridBounds.set(bounds) }}
        >
          <CalendarOrRangeStateContext.Provider value={state}>
            <View
              {...rest}
              ref={calendarRef}
              class={classValue()}
              accessibilityLabel={ariaLabel()}
              accessibilityState={{ disabled: state.isDisabled }}
            >
              {resolveChildren(local.children)}
            </View>
          </CalendarOrRangeStateContext.Provider>
        </CalendarGridLayoutContext.Provider>
      </YearPickerContext.Provider>
    </RangeCalendarContext.Provider>
  );
}
