import type { Bounds, JSX, ViewProps, ViewRef } from "nsh";
import { computed, split, View } from "nsh";
import type { CalendarDate, DateDuration } from "@internationalized/date";
import { endOfMonth, startOfWeek, today } from "@internationalized/date";

import { createInteractionModality } from "../../primitives/create-interaction-modality";
import { createKeymapScope } from "../../primitives/create-keymap-scope";
import { CalendarGridLayoutContext } from "../calendar/calendar-context";
import type { WeekdayStyle } from "../calendar/date-utils";
import {
  formatVisibleRangeDescription,
  getDayViewGridRows,
  getDayViewWeekDayLabels,
} from "../calendar/date-utils";
import { RangeCalendarCell } from "./range-calendar-cell";
import { RangeCalendarGridBody } from "./range-calendar-grid-body";
import { RangeCalendarGridHeader } from "./range-calendar-grid-header";
import { RangeCalendarHeaderCell } from "./range-calendar-header-cell";
import { RangeCalendarGridContext, useRangeCalendarContext } from "./range-calendar-context";
import type { RangeCalendarGridContextValue } from "./range-calendar-context";

export interface RangeCalendarGridProps extends Omit<ViewProps, "children" | "class" | "ref"> {
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
 * `RangeCalendar.Grid`: one date grid, a column container whose header and
 * every row are their own seven-column grids (R-005, R-019…R-023).
 *
 * It derives the collection every other grid part reads (rows, weekday labels,
 * the accessible name, the cell focus hooks) and provides it as
 * `RangeCalendarGridContext`; upstream's `<table>`/`display:contents` layers
 * have no NSH equivalent, so the seven columns live on the header and on each
 * row view (§4c).
 */
export function RangeCalendarGrid(props: RangeCalendarGridProps): JSX.Element {
  const { state, slots, ariaLabel, direction, isYearPickerOpen } = useRangeCalendarContext();
  const layout = CalendarGridLayoutContext();
  const [local, rest] = split(props, [
    "children",
    "offset",
    "weekdayStyle",
    "className",
    "ref",
    "onLayout",
  ]);

  // Modality tracking: the grid owns no ring of its own, but every key it
  // handles is a keyboard act, and the cells use the same tracker for their
  // focus ring (RAC marks the grid `status-focused` from a press too).
  const modality = createInteractionModality();
  let pendingBlur: number | undefined;

  const locale = state.locale;
  const timeZone = state.timeZone;
  const days = state.visibleDuration.days;
  const isNarrowDayView = days != null && days < 7;
  const isWideDayView = days != null && days >= 7;
  const weekdayStyle = local.weekdayStyle ?? "short";

  // RAC's `useCalendarGrid`: `visibleRange.start` shifted by the grid's offset.
  const startDate = computed<CalendarDate>(() =>
    state.visibleRange().start.add(local.offset ?? {}),
  );

  // Week rows. A month or week view pages `getDatesInWeek` a week at a time; a
  // day view under seven days puts `days` slots in one row (the core pads a
  // short week); a wide day view aligns the visible range to whole weeks with
  // padding slots at both ends (port sheet §2.2).
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

  // Weekday labels: the locale's names for a month/week view and for a wide day
  // view (from the week's first day), the range's own days for a narrow one.
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

  // The grid's accessible name: the root's label plus the visible range.
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

  // The cells report focus; the grid keeps the keyboard bindings only while it
  // holds it. A blur is deferred one turn because moving between two cells
  // fires the next cell's focus in the same pass.
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

  // Upstream `useCalendarGrid`'s key set, unchanged from `Calendar` (port sheet
  // §2.3: no new keys in range mode). Return and Space arrive as a native press
  // on the focused cell and are routed there, so they stay unbound here.
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

  // The year panel aligns itself to this frame instead of querying the DOM
  // (§2.3).
  const handleLayout = (event: { bounds: Bounds }) => {
    local.onLayout?.(event);
    layout?.setBounds(event.bounds);
  };

  const gridContext: RangeCalendarGridContextValue = {
    startDate,
    weekDays,
    rows,
    gridLabel,
    isNarrowDayView: () => isNarrowDayView,
    onCellFocus,
    onCellBlur,
  };

  return (
    <RangeCalendarGridContext.Provider value={gridContext}>
      <View
        {...rest}
        ref={(node) => local.ref?.(node)}
        role="grid"
        focusable={false}
        accessibilityLabel={gridLabel()}
        accessibilityState={{ disabled: state.isDisabled }}
        onLayout={handleLayout}
        accessibilityElementsHidden={isYearPickerOpen()}
        class={`${slots.grid()} ${
          // R-052: upstream's 150ms opacity/visibility transition and its
          // `will-change` are deleted (no motion in this phase). R-053: while
          // the year panel is open the day grid is invisible, out of the
          // pointer's way and out of the accessibility tree; the delayed
          // `visibility` switch is not copied, so it hides at once.
          isYearPickerOpen() ? "invisible opacity-0 pointer-events-none" : ""
        } ${local.className ?? ""}`}
      >
        {typeof local.children === "function"
          ? [
              // A function child builds the default collection, as in
              // `Calendar.Grid`. It receives a date, so it stands for
              // `GridBody`'s per-cell function; the header is the default one.
              <RangeCalendarGridHeader>
                {(day) => <RangeCalendarHeaderCell>{day}</RangeCalendarHeaderCell>}
              </RangeCalendarGridHeader>,
              <RangeCalendarGridBody>
                {(date) => <RangeCalendarCell date={date} />}
              </RangeCalendarGridBody>,
            ]
          : local.children}
      </View>
    </RangeCalendarGridContext.Provider>
  );
}
