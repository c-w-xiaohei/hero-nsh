import type { Bounds, JSX, ViewProps, ViewRef } from "nsh";
import { computed, locale as hostLocale, signal, split, View } from "nsh";
import type { CalendarIdentifier, DateDuration, DateValue } from "@internationalized/date";
import { createCalendar as createCalendarDefault } from "@internationalized/date";

import { createControllableBooleanSignal } from "../../primitives/create-controllable-signal";
import {
  CalendarContext,
  CalendarDefaultsContext,
  CalendarGridLayoutContext,
  type CalendarRenderProps,
} from "./calendar-context";
import { calendarVariants } from "./calendar.styles";
import type {
  CalendarPageBehavior,
  CalendarSelectionAlignment,
  CalendarSelectionMode,
  CalendarWeeksInMonth,
} from "./create-calendar-state";
import { createCalendarState } from "./create-calendar-state";
import type { FirstDayOfWeek } from "./date-utils";
import { YearPickerContext, type YearPickerContextValue } from "./year-picker-context";

/** The locale's reading direction, with a language fallback for hosts whose
 * `Intl.Locale` lacks `textInfo`. */
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

export interface CalendarRootProps extends Omit<ViewProps, "children" | "class" | "ref"> {
  /** Nodes, or a function called once with the calendar's state accessors. */
  children?: JSX.Element | ((values: CalendarRenderProps) => JSX.Element);

  /** Appended after the root slot classes; later classes win. */
  className?: string;

  /** The selected date (single) or dates (multiple). Controlled. */
  value?: DateValue | DateValue[] | null;

  /** The initial selection, uncontrolled. */
  defaultValue?: DateValue | DateValue[] | null;

  /** Called with the new selection. */
  onChange?: (value: DateValue | DateValue[] | null) => void;

  /** The date that has keyboard focus. Controlled. */
  focusedValue?: DateValue | null;

  /** The initial focused date, uncontrolled. */
  defaultFocusedValue?: DateValue | null;

  /** Called when the focused date moves. */
  onFocusChange?: (date: DateValue) => void;

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

  /** Single date or multiple dates. @default "single" */
  selectionMode?: CalendarSelectionMode;

  /** How the initial window lines up with the selection. @default "center" */
  selectionAlignment?: CalendarSelectionAlignment;

  /** Weeks per month row: a number, or `single` / `double` / `all`. */
  weeksInMonth?: CalendarWeeksInMonth;

  /** Keeps at least one date selected in multiple mode. */
  disallowEmptySelection?: boolean;

  /** Disables the whole calendar. */
  isDisabled?: boolean;

  /** Keeps the calendar focusable but unchanged by the user. */
  isReadOnly?: boolean;

  /** Marks dates the user may not pick; they stay focusable. */
  isDateUnavailable?: (date: DateValue) => boolean;

  /** Focuses the focused date after mount (web and macOS; see §8). */
  autoFocus?: boolean;

  /** Builds the calendar for an identifier; defaults to `@internationalized/date`. */
  createCalendar?: (name: CalendarIdentifier) => ReturnType<typeof createCalendarDefault>;

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
 * `Calendar.Root`: HeroUI 3.2.7's `CalendarRoot`. It owns the date state,
 * provides it to every part, and renders the `YearPickerContext` the year
 * panel reads.
 */
export function CalendarRoot(props: CalendarRootProps): JSX.Element {
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
    "selectionMode",
    "selectionAlignment",
    "weeksInMonth",
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
  // A calendar outside such a picker reads `undefined` and behaves as before.
  const defaults = CalendarDefaultsContext();

  const fallback = <T,>(own: T | undefined, read: (() => T | undefined) | undefined): T | undefined =>
    own !== undefined ? own : read?.();

  const state = createCalendarState({
    locale,
    createCalendar: fallback(local.createCalendar, defaults?.createCalendar),
    // `value` is the one input the state keeps reading after it is created
    // (`createControllableSignal` reads it through an accessor), so it stays an
    // accessor through a getter: a picker-driven calendar follows the picker's
    // value instead of a copy taken at mount.
    get value() {
      return fallback(local.value, defaults?.value);
    },
    defaultValue: local.defaultValue,
    onChange: local.onChange ?? defaults?.onChange,
    focusedValue: local.focusedValue,
    defaultFocusedValue: fallback(local.defaultFocusedValue, defaults?.defaultFocusedValue),
    onFocusChange: local.onFocusChange,
    minValue: fallback(local.minValue, defaults?.minValue),
    maxValue: fallback(local.maxValue, defaults?.maxValue),
    visibleDuration: local.visibleDuration,
    firstDayOfWeek: local.firstDayOfWeek,
    pageBehavior: local.pageBehavior,
    selectionMode: local.selectionMode,
    selectionAlignment: local.selectionAlignment,
    weeksInMonth: local.weeksInMonth,
    disallowEmptySelection: local.disallowEmptySelection,
    isDisabled: fallback(local.isDisabled, defaults?.isDisabled),
    isReadOnly: fallback(local.isReadOnly, defaults?.isReadOnly),
    isDateUnavailable: fallback(local.isDateUnavailable, defaults?.isDateUnavailable),
    autoFocus: fallback(local.autoFocus, defaults?.autoFocus),
  });

  const [isYearPickerOpen, setIsYearPickerOpen] = createControllableBooleanSignal({
    value: () => local.isYearPickerOpen,
    defaultValue: () => local.defaultYearPickerOpen ?? false,
    onChange: (next) => local.onYearPickerOpenChange?.(next),
  });

  const gridBounds = signal<Bounds | undefined>(undefined);
  const slots = calendarVariants();

  const calendarRef = (next: ViewRef) => {
    local.ref?.(next);
  };

  const yearPicker: YearPickerContextValue = {
    isYearPickerOpen,
    setIsYearPickerOpen,
    calendarRef,
    calendarGridSlot: "calendar-grid",
  };

  const ariaLabel = () => local["aria-label"];
  const direction = computed(() => localeDirection(locale));

  const renderValues: CalendarRenderProps = {
    state,
    isDisabled: () => state.isDisabled,
    isInvalid: state.isValueInvalid,
  };

  const classValue = () => `${slots.base()} ${local.className ?? ""}`;

  return (
    <CalendarContext.Provider
      value={{
        state,
        slots,
        ariaLabel,
        direction,
        isYearPickerOpen,
      }}
    >
      <YearPickerContext.Provider value={yearPicker}>
        <CalendarGridLayoutContext.Provider
          value={{ bounds: gridBounds, setBounds: (bounds) => gridBounds.set(bounds) }}
        >
          {/* Port-sheet R-042: the root is always the year panel's containing block. */}
          <View
            {...rest}
            ref={calendarRef}
            class={classValue()}
            accessibilityLabel={ariaLabel()}
            accessibilityState={{ disabled: state.isDisabled }}
          >
            {typeof local.children === "function" ? local.children(renderValues) : local.children}
          </View>
        </CalendarGridLayoutContext.Provider>
      </YearPickerContext.Provider>
    </CalendarContext.Provider>
  );
}
