import type { Bounds, JSX, ViewProps, ViewRef } from "nsh";
import { computed, locale as hostLocale, signal, split, View } from "nsh";
import type { CalendarIdentifier, DateDuration, DateValue } from "@internationalized/date";
import { createCalendar as createCalendarDefault } from "@internationalized/date";

import { createControllableBooleanSignal } from "../../primitives/create-controllable-signal";
import {
  CalendarContext,
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
  const state = createCalendarState({
    locale,
    createCalendar: local.createCalendar,
    value: local.value,
    defaultValue: local.defaultValue,
    onChange: local.onChange,
    focusedValue: local.focusedValue,
    defaultFocusedValue: local.defaultFocusedValue,
    onFocusChange: local.onFocusChange,
    minValue: local.minValue,
    maxValue: local.maxValue,
    visibleDuration: local.visibleDuration,
    firstDayOfWeek: local.firstDayOfWeek,
    pageBehavior: local.pageBehavior,
    selectionMode: local.selectionMode,
    selectionAlignment: local.selectionAlignment,
    weeksInMonth: local.weeksInMonth,
    disallowEmptySelection: local.disallowEmptySelection,
    isDisabled: local.isDisabled,
    isReadOnly: local.isReadOnly,
    isDateUnavailable: local.isDateUnavailable,
    autoFocus: local.autoFocus,
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
