import type { Accessor, JSX, ScrollProps, ViewRef } from "nsh";
import { computed, context, effect, signal, split, Scroll, untracked, View } from "nsh";
import type { CalendarDate } from "@internationalized/date";
import { DateFormatter, isSameDay, isSameYear, toCalendarDate } from "@internationalized/date";

import { createInteractionModality } from "../../../primitives/create-interaction-modality";
import { createKeymapScope } from "../../../primitives/create-keymap-scope";
import { CalendarGridLayoutContext, useCalendarOrRangeState } from "../../calendar/calendar-context";
import type { CalendarHeadingFormatOptions } from "../../calendar/date-utils";
import { getYearRange } from "../../calendar/date-utils";
import { useYearPicker } from "../../calendar/year-picker-context";
import { calendarYearPickerVariants } from "../calendar-year-picker.styles";

export interface CalendarYearPickerFormatOptions {
  year?: "numeric" | "2-digit";
  era?: CalendarHeadingFormatOptions["era"];
}

export interface CalendarYearPickerCellRenderProps {
  year: number;
  formattedYear: string;
  isSelected: Accessor<boolean>;
  isCurrentYear: Accessor<boolean>;
  isOpen: Accessor<boolean>;
  selectYear: () => void;
}

export interface CalendarYearPickerGridProps extends Omit<ScrollProps, "children" | "class" | "ref"> {
  children?: JSX.Element;
  className?: string;
  format?: CalendarYearPickerFormatOptions;
  /** Years in the window; min/max span by default. */
  visibleYears?: number;

  /** Accepted, no effect: NSH has no key-down event; the grid binds keys instead. */
  onKeyDown?: (event: unknown) => void;

  ref?: (node: ViewRef) => void;
}

export interface CalendarYearPickerGridContextValue {
  years: Accessor<readonly number[]>;
  isOpen: Accessor<boolean>;
  activeYear: Accessor<number>;
  focusedYear: Accessor<number>;
  currentYear: Accessor<number>;
  formattedYear: (year: number) => string;
  isSelected: (year: number) => boolean;
  selectYear: (year: number) => void;
  setActiveYear: (year: number) => void;
  registerCell: (year: number, node: ViewRef) => void;
  unregisterCell: (year: number) => void;
  setGridFocused: (focused: boolean) => void;
  /** A year cell took the focus: the grid owns the keys. */
  onCellFocus: (year: number) => void;
  /** A year cell lost the focus, unless another one takes it this turn. */
  onCellBlur: () => void;
}

export const CalendarYearPickerGridContext =
  context<CalendarYearPickerGridContextValue | undefined>(undefined);

export function useCalendarYearPickerGridContext(): CalendarYearPickerGridContextValue {
  const value = CalendarYearPickerGridContext();
  if (!value) {
    throw new Error("CalendarYearPicker components must be used within <Calendar.YearPickerGrid>.");
  }
  return value;
}

interface YearItem {
  id: number;
  date: CalendarDate;
  formatted: string;
}

/** `useCalendarYearPicker`'s window and items (react-aria/src/calendar). */
function buildYearItems(
  focused: CalendarDate,
  count: number,
  minValue: CalendarDate | undefined,
  maxValue: CalendarDate | undefined,
  formatter: DateFormatter,
  timeZone: string,
): { items: YearItem[]; value: number } {
  let minDate = focused.subtract({ years: Math.floor(count / 2) });
  let maxDate = focused.add({ years: Math.ceil(count / 2) - 1 });

  if (maxValue && maxDate.compare(maxValue) > 0) {
    maxDate = toCalendarDate(maxValue);
    minDate = maxDate.subtract({ years: count - 1 });
  }
  if (minValue && minDate.compare(minValue) < 0) {
    minDate = toCalendarDate(minValue);
    maxDate = minDate.add({ years: count - 1 });
    if (maxValue && maxDate.compare(maxValue) > 0) maxDate = toCalendarDate(maxValue);
  }

  const items: YearItem[] = [];
  let value = 0;
  let date = minDate;

  while (date.compare(maxDate) <= 0 || isSameYear(date, maxDate)) {
    const itemDate = date.compare(maxDate) > 0 ? maxDate : date;
    if (isSameYear(itemDate, focused)) value = items.length;
    items.push({
      id: items.length,
      date: itemDate,
      formatted: formatter.format(itemDate.toDate(timeZone)),
    });

    const next = date.add({ years: 1 });
    if (isSameDay(date, next)) break;
    date = next;
  }

  return { items, value };
}

/**
 * `Calendar.YearPickerGrid`: the three-column year panel. NSH's scrolling must
 * be a `Scroll`, so upstream's one scrolling `listbox` becomes `Scroll` plus an
 * inner `role="listbox"` grid (R-055…R-057); the panel is positioned over the
 * date grid with the bounds that grid reports through `onLayout` (R-069).
 */
export function CalendarYearPickerGrid(props: CalendarYearPickerGridProps): JSX.Element {
  const parent = useYearPicker();
  const state = useCalendarOrRangeState();
  const layout = CalendarGridLayoutContext();
  const [local, rest] = split(props, [
    "children",
    "className",
    "format",
    "visibleYears",
    "onKeyDown",
    "ref",
    "style",
  ]);

  const slots = calendarYearPickerVariants();
  const modality = createInteractionModality();
  const activeYear = signal(0);
  const gridFocused = signal(false);
  const cellRefs = new Map<number, ViewRef>();
  let pendingBlur: number | undefined;

  const isOpen = parent.isYearPickerOpen;
  const count = computed(
    () =>
      local.visibleYears ??
      (state.minValue && state.maxValue
        ? getYearRange(state.minValue, state.maxValue).length
        : 20),
  );

  const built = computed(() => {
    const focused = state.focusedDate();
    const formatter = new DateFormatter(state.locale, {
      year: local.format?.year ?? "numeric",
      era:
        local.format?.era ??
        (focused.calendar.identifier === "gregory" && focused.era === "BC" ? "short" : undefined),
      calendar: focused.calendar.identifier,
      timeZone: state.timeZone,
    });
    return buildYearItems(
      focused,
      Math.max(1, count()),
      state.minValue ? toCalendarDate(state.minValue) : undefined,
      state.maxValue ? toCalendarDate(state.maxValue) : undefined,
      formatter,
      state.timeZone,
    );
  });

  const years = computed<readonly number[]>(() => built().items.map((item) => item.date.year));
  const focusedYear = computed(
    () => built().items[built().value]?.date.year ?? state.focusedDate().year,
  );
  const currentYear = computed(() => new Date().getFullYear());
  const formattedYear = (year: number) =>
    built().items.find((item) => item.date.year === year)?.formatted ?? String(year);
  const isSelected = (year: number) => year === focusedYear();

  const selectYear = (year: number) => {
    const item = built().items.find((entry) => entry.date.year === year);
    if (!item) return;
    // Upstream closes first, then moves the focused date; the selected value is
    // untouched (port sheet §2.1).
    parent.setIsYearPickerOpen(false);
    state.setFocusedDate(item.date);
  };

  const registerCell = (year: number, node: ViewRef) => {
    cellRefs.set(year, node);
  };

  const unregisterCell = (year: number) => {
    cellRefs.delete(year);
  };

  const onCellFocus = (year: number) => {
    if (pendingBlur != null) {
      clearTimeout(pendingBlur);
      pendingBlur = undefined;
    }
    setGridFocused(true);
    setActiveYear(year);
  };

  const onCellBlur = () => {
    if (pendingBlur != null) clearTimeout(pendingBlur);
    pendingBlur = setTimeout(() => {
      pendingBlur = undefined;
      setGridFocused(false);
    }, 0);
  };

  const setActiveYear = (year: number) => activeYear.set(year);
  const setGridFocused = (focused: boolean) => gridFocused.set(focused);

  const focusCell = (year: number) => {
    untracked(() => {
      setActiveYear(year);
      cellRefs.get(year)?.focus();
    });
  };

  // R-053's open effect: focus the active year when the panel opens.
  effect(() => {
    const open = isOpen();
    if (!open) return;

    untracked(() => {
      const list = years();
      if (list.length === 0) return;
      const target = list.includes(focusedYear()) ? focusedYear() : list[0]!;
      setActiveYear(target);
      const wasKeyboard = modality.isKeyboard();
      cellRefs.get(target)?.focus();
      // A pointer-open focuses the year only to make the keys reach it; the
      // focus ring stays off, as RAC's modality does.
      if (!wasKeyboard) modality.setPointerModality();
    });
  });

  const move = (offset: number) => {
    const list = years();
    const index = list.indexOf(activeYear());
    if (index < 0) return;
    const next = Math.min(Math.max(index + offset, 0), list.length - 1);
    const year = list[next];
    if (year != null) focusCell(year);
  };

  createKeymapScope({
    isActive: gridFocused,
    bindings: {
      escape: () => {
        modality.setKeyboardModality();
        if (isOpen()) parent.setIsYearPickerOpen(false);
      },
      home: () => {
        modality.setKeyboardModality();
        const first = years()[0];
        if (first != null) focusCell(first);
      },
      end: () => {
        modality.setKeyboardModality();
        const list = years();
        const last = list[list.length - 1];
        if (last != null) focusCell(last);
      },
      arrowleft: () => {
        modality.setKeyboardModality();
        move(-1);
      },
      arrowright: () => {
        modality.setKeyboardModality();
        move(1);
      },
      arrowup: () => {
        modality.setKeyboardModality();
        move(-3);
      },
      arrowdown: () => {
        modality.setKeyboardModality();
        move(3);
      },
    },
    options: { repeat: true },
  });

  const ariaLabel = () => {
    try {
      return new Intl.DisplayNames(state.locale, { type: "dateTimeField" }).of("year") ?? "Year";
    } catch {
      return "Year";
    }
  };

  // R-069: the panel covers the date grid's exact frame, reported by the grid
  // through `onLayout` instead of a DOM query.
  const positionStyle = () => {
    const bounds = layout?.bounds();
    if (!bounds) return {};
    return { top: bounds.origin.y, height: bounds.size.height };
  };

  const gridContext: CalendarYearPickerGridContextValue = {
    years,
    isOpen,
    activeYear,
    focusedYear,
    currentYear,
    formattedYear,
    isSelected,
    selectYear,
    setActiveYear,
    registerCell,
    unregisterCell,
    setGridFocused,
    onCellFocus,
    onCellBlur,
  };

  return (
    <CalendarYearPickerGridContext.Provider value={gridContext}>
      <Scroll
        {...rest}
        ref={(node) => local.ref?.(node)}
        scrollbar
        style={[positionStyle(), local.style]}
        class={`${slots.yearGrid()} ${
          // R-059: open paint and pointer behavior.
          isOpen() ? "visible opacity-100 pointer-events-auto" : "invisible opacity-0 pointer-events-none"
        } ${local.className ?? ""}`}
      >
        {/* R-058: three equal year columns. */}
        <View
          role="listbox"
          accessibilityLabel={ariaLabel()}
          accessibilityElementsHidden={!isOpen()}
          class="grid grid-cols-3 content-start gap-1 p-1"
        >
          {local.children}
        </View>
      </Scroll>
    </CalendarYearPickerGridContext.Provider>
  );
}
