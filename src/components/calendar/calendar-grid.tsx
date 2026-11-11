import type { Bounds, JSX, ViewProps, ViewRef } from "nsh";
import { computed, split, View } from "nsh";
import type { CalendarDate, DateDuration } from "@internationalized/date";
import { endOfMonth, startOfWeek, today } from "@internationalized/date";

import { createKeymapScope } from "../../primitives/create-keymap-scope";
import { createInteractionModality } from "../../primitives/create-interaction-modality";
import { CalendarGridContext, CalendarGridLayoutContext } from "./calendar-context";
import { CalendarCell } from "./calendar-cell";
import { CalendarGridBody } from "./calendar-grid-body";
import { CalendarGridHeader } from "./calendar-grid-header";
import { CalendarHeaderCell } from "./calendar-header-cell";
import type { WeekdayStyle } from "./date-utils";
import {
  formatVisibleRangeDescription,
  getDayViewGridRows,
  getDayViewWeekDayLabels,
} from "./date-utils";
import { useCalendarContext } from "./calendar-context";
import { useYearPicker } from "./year-picker-context";

export interface CalendarGridProps extends Omit<ViewProps, "children" | "class" | "ref"> {
  /** An element tree, or a function that builds one cell per date. */
  children?: JSX.Element | ((date: CalendarDate) => JSX.Element);

  /** How far from the visible range's start this grid begins (multi-month). */
  offset?: DateDuration;

  /** Weekday label style. @default "short" */
  weekdayStyle?: WeekdayStyle;

  className?: string;
  ref?: (node: ViewRef) => void;
}

/**
 * `Calendar.Grid`: one date grid. Upstream is a table with `display:contents`
 * wrappers; NSH has neither, so the grid is a column container whose header
 * and every row are their own seven-column grids (R-019/R-023).
 */
export function CalendarGrid(props: CalendarGridProps): JSX.Element {
  const { state, slots, ariaLabel, direction } = useCalendarContext();
  const yearPicker = useYearPicker();
  const layout = CalendarGridLayoutContext();
  const [local, rest] = split(props, [
    "children",
    "offset",
    "weekdayStyle",
    "className",
    "ref",
    "onLayout",
  ]);

  const modality = createInteractionModality();
  let pendingBlur: number | undefined;

  const locale = state.locale;
  const timeZone = state.timeZone;
  const days = state.visibleDuration.days;
  const isNarrowDayView = days != null && days < 7;
  const isWideDayView = days != null && days >= 7;
  const weekdayStyle = local.weekdayStyle ?? "short";

  const startDate = computed<CalendarDate>(() =>
    state.visibleRange().start.add(local.offset ?? {}),
  );

  const rows = computed<readonly (readonly (CalendarDate | null)[])[]>(() => {
    if (isWideDayView) {
      return getDayViewGridRows(
        state.visibleRange().start,
        state.visibleRange().end,
        locale,
        state.firstDayOfWeek,
      ) as (CalendarDate | null)[][];
    }
    const weeks = state.getWeeksInMonth(startDate());
    return Array.from({ length: weeks }, (_, index) => state.getDatesInWeek(index, startDate()));
  });

  const weekDays = computed<readonly string[]>(() => {
    if (isWideDayView) {
      return getDayViewWeekDayLabels(
        state.visibleRange().start,
        locale,
        state.firstDayOfWeek,
        weekdayStyle,
        timeZone,
      );
    }

    const count = isNarrowDayView ? days! : 7;
    const weekStart = isNarrowDayView
      ? startDate()
      : startOfWeek(today(timeZone), locale, state.firstDayOfWeek);
    const formatter = new Intl.DateTimeFormat(locale, { weekday: weekdayStyle, timeZone });
    return Array.from({ length: count }, (_, index) =>
      formatter.format(weekStart.add({ days: index }).toDate(timeZone)),
    );
  });

  const gridLabel = computed(() => {
    const gridStart = startDate();
    const description = formatVisibleRangeDescription(
      gridStart,
      endOfMonth(gridStart),
      timeZone,
      locale,
    );
    return [ariaLabel(), description].filter(Boolean).join(", ");
  });

  const onCellFocus = (date: CalendarDate) => {
    if (pendingBlur != null) {
      clearTimeout(pendingBlur);
      pendingBlur = undefined;
    }
    state.setFocused(true);
    state.setFocusedDate(date);
  };

  const onCellBlur = () => {
    if (pendingBlur != null) clearTimeout(pendingBlur);
    pendingBlur = setTimeout(() => {
      pendingBlur = undefined;
      state.setFocused(false);
    }, 0);
  };

  createKeymapScope({
    isActive: state.isFocused,
    bindings: {
      escape: () => {
        // Nothing to cancel outside a range selection; the year panel owns its
        // own Escape binding.
        modality.setKeyboardModality();
      },
      home: () => {
        modality.setKeyboardModality();
        state.focusSectionStart();
      },
      end: () => {
        modality.setKeyboardModality();
        state.focusSectionEnd();
      },
      pageup: () => {
        modality.setKeyboardModality();
        state.focusPreviousSection();
      },
      "shift+pageup": () => {
        modality.setKeyboardModality();
        state.focusPreviousSection(true);
      },
      pagedown: () => {
        modality.setKeyboardModality();
        state.focusNextSection();
      },
      "shift+pagedown": () => {
        modality.setKeyboardModality();
        state.focusNextSection(true);
      },
      arrowleft: () => {
        modality.setKeyboardModality();
        if (direction() === "rtl") state.focusNextDay();
        else state.focusPreviousDay();
      },
      arrowright: () => {
        modality.setKeyboardModality();
        if (direction() === "rtl") state.focusPreviousDay();
        else state.focusNextDay();
      },
      arrowup: () => {
        modality.setKeyboardModality();
        state.focusPreviousRow();
      },
      arrowdown: () => {
        modality.setKeyboardModality();
        state.focusNextRow();
      },
    },
    options: { repeat: true },
  });

  const handleLayout = (event: { bounds: Bounds }) => {
    local.onLayout?.(event);
    layout?.setBounds(event.bounds);
  };

  const gridContext = {
    startDate,
    weekDays,
    rows,
    gridLabel,
    isNarrowDayView: () => isNarrowDayView,
    onCellFocus,
    onCellBlur,
  };

  return (
    <CalendarGridContext.Provider value={gridContext}>
      <View
        {...rest}
        ref={(node) => local.ref?.(node)}
        role="grid"
        focusable={false}
        accessibilityLabel={gridLabel()}
        accessibilityState={{ disabled: state.isDisabled }}
        onLayout={handleLayout}
        accessibilityElementsHidden={yearPicker.isYearPickerOpen()}
        class={`${slots.grid()} ${
          // R-043/R-044: upstream fades the day grid out over 150ms, then
          // switches `visibility: hidden` 150ms later. NSH has no delayed
          // visibility, so the grid stays mounted at opacity 0 (removed from
          // the accessibility tree above, and its cells leave the Tab order in
          // CalendarCell) and only opacity transitions. The year panel is
          // painted after this view, so the two fade without ghosting.
          "transition-opacity duration-150 ease-out motion-reduce:transition-none"
        } ${
          yearPicker.isYearPickerOpen() ? "opacity-0 pointer-events-none" : ""
        } ${local.className ?? ""}`}
      >
        {typeof local.children === "function"
          ? [
              <CalendarGridHeader>
                {(day) => <CalendarHeaderCell>{day}</CalendarHeaderCell>}
              </CalendarGridHeader>,
              <CalendarGridBody>{(date) => <CalendarCell date={date} />}</CalendarGridBody>,
            ]
          : local.children}
      </View>
    </CalendarGridContext.Provider>
  );
}
