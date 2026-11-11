import type { JSX, MouseEvent as NshMouseEvent, PressEvent, ViewProps, ViewRef } from "nsh";
import { computed, effect, signal, split, Text, View } from "nsh";
import type { CalendarDate } from "@internationalized/date";
import { DateFormatter, isSameDay, isSameMonth, isToday } from "@internationalized/date";

import {
  createInteractionModality,
  isKeyboardPress,
} from "../../primitives/create-interaction-modality";
import { renderChildren } from "./children";
import { CalendarCellContext, useCalendarContext, useCalendarGridContext } from "./calendar-context";
import type { CalendarCellRenderProps } from "./calendar-context";

export interface CalendarCellProps extends Omit<ViewProps, "children" | "class" | "onPress" | "ref"> {
  /** The date this cell shows; required. */
  date: CalendarDate;

  /** Nodes, or a function called once with the cell's state accessors. */
  children?: JSX.Element | ((values: CalendarCellRenderProps) => JSX.Element);

  className?: string;

  /** Keeps this cell out of the Tab order (roving focus uses it). */
  excludeFromTabOrder?: boolean;

  onPress?: (event: PressEvent) => void;
  onHoverStart?: (event: NshMouseEvent) => void;
  onHoverEnd?: (event: NshMouseEvent) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  ref?: (node: ViewRef) => void;
}

function eraFormat(date: CalendarDate): "short" | undefined {
  return date.calendar.identifier === "gregory" && date.era === "BC" ? "short" : undefined;
}

/**
 * `Calendar.Cell`: one day. The outer view is upstream's `td[role=gridcell]`;
 * the inner, focusable view is its `div[role=button]` and carries every visual
 * and state class (R-025…R-038).
 */
export function CalendarCell(props: CalendarCellProps): JSX.Element {
  const { state, slots } = useCalendarContext();
  const grid = useCalendarGridContext();
  const [local, rest] = split(props, [
    "date",
    "children",
    "className",
    "excludeFromTabOrder",
    "onPress",
    "onHoverStart",
    "onHoverEnd",
    "onFocus",
    "onBlur",
    "ref",
  ]);

  const date = local.date;
  const modality = createInteractionModality();
  const hovered = signal(false);
  const pressed = signal(false);

  let node: ViewRef | undefined;

  const outsideMonth = computed(
    () => state.visibleDuration.days == null && state.visibleDuration.weeks == null
      ? !isSameMonth(grid.startDate(), date)
      : false,
  );
  const disabled = computed(() => state.isCellDisabled(date) || outsideMonth());
  const unavailable = computed(() => state.isCellUnavailable(date));
  const selected = computed(() => state.isSelected(date));
  const focused = computed(() => state.isCellFocused(date) && !outsideMonth());
  const focusVisible = computed(() => focused() && modality.isKeyboard());
  const today = computed(() => isToday(date, state.timeZone));
  const outsideVisibleRange = computed(() => {
    const range = state.visibleRange();
    return date.compare(range.start) < 0 || date.compare(range.end) > 0;
  });
  const invalid = computed(() => state.isValueInvalid() && selected());
  const isTabStop = computed(
    () => !disabled() && local.excludeFromTabOrder !== true && isSameDay(date, state.focusedDate()),
  );

  const dateFormatter = new DateFormatter(state.locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    era: eraFormat(date),
    timeZone: state.timeZone,
  });
  const dayFormatter = new DateFormatter(state.locale, {
    day: "numeric",
    timeZone: state.timeZone,
    calendar: date.calendar.identifier,
  });

  const formattedDate =
    dayFormatter
      .formatToParts(date.toDate(state.timeZone))
      .find((part) => part.type === "day")?.value ?? String(date.day);

  const accessibilityLabel = () => {
    let label = dateFormatter.format(date.toDate(state.timeZone));
    if (today()) label = selected() ? `Today, ${label} selected` : `Today, ${label}`;
    else if (selected()) label = `${label} selected`;
    if (state.minValue && isSameDay(date, state.minValue)) label += ", Minimum date";
    else if (state.maxValue && isSameDay(date, state.maxValue)) label += ", Maximum date";
    return label;
  };

  // RAC focuses the cell in an effect whenever it becomes the focused date.
  effect(() => {
    if (focused()) node?.focus();
  });

  const values: CalendarCellRenderProps = {
    date,
    formattedDate,
    isHovered: hovered,
    isPressed: pressed,
    isSelected: selected,
    isSelectionStart: () => false,
    isSelectionEnd: () => false,
    isFocused: focused,
    isFocusVisible: focusVisible,
    isDisabled: disabled,
    isOutsideVisibleRange: outsideVisibleRange,
    isOutsideMonth: outsideMonth,
    isUnavailable: unavailable,
    isInvalid: invalid,
    isToday: today,
  };

  const classes = () =>
    `${slots.cell()} ${
      // R-028: focus ring only for keyboard focus.
      focusVisible() ? "ring-2 ring-focus" : ""
    } ${
      // R-029: today paint.
      today() ? "bg-accent-soft text-accent-soft-foreground" : ""
    } ${
      // R-031: selected paint.
      selected() ? "bg-accent text-accent-foreground" : ""
    } ${
      // R-030: today's hover, for a non-selected today.
      today() && !selected() ? "hover:bg-accent-soft-hover" : ""
    } ${
      // R-034: generic hover for a non-selected cell.
      !selected() ? "hover:bg-default" : ""
    } ${
      // R-035: outside-month dimming.
      outsideMonth() ? "text-muted opacity-50" : ""
    } ${
      // R-036: a selected outside-month cell returns to the default paint.
      selected() && outsideMonth() ? "bg-default" : ""
    } ${
      // R-037: unavailable dates.
      unavailable() ? "opacity-50 cursor-not-allowed pointer-events-none" : ""
    } ${
      // R-038: disabled dates outside the current month are struck through.
      disabled() && !outsideMonth()
        ? "opacity-50 cursor-not-allowed pointer-events-none line-through"
        : ""
    } ${
      // R-020: read-only dates keep focus but take no pointer.
      state.isReadOnly ? "pointer-events-none" : ""
    } ${
      // R-032: pressed paint and scale.
      "active:bg-default active:scale-[0.95]"
    } ${
      // R-033: a pressed selected cell stays on the accent hover paint.
      selected() ? "active:bg-accent-hover" : ""
    } ${local.className ?? ""}`;

  const child =
    typeof local.children === "function"
      ? renderChildren(local.children(values))
      : renderChildren(local.children ?? <Text>{formattedDate}</Text>);

  return (
    <CalendarCellContext.Provider value={{ isSelected: selected }}>
      <View
        {...rest}
        role="cell"
        accessibilityState={{ selected: selected(), disabled: disabled() }}
        class="w-full"
      >
        <View
          ref={(next) => {
            node = next;
            local.ref?.(next);
          }}
          role="button"
          focusable={isTabStop()}
          disabled={disabled()}
          accessibilityLabel={accessibilityLabel()}
          accessibilityState={{
            selected: selected(),
            disabled: disabled() || unavailable(),
          }}
          class={classes()}
          onFocus={() => {
            local.onFocus?.();
            modality.onFocus();
            grid.onCellFocus(date);
          }}
          onBlur={() => {
            local.onBlur?.();
            grid.onCellBlur();
          }}
          onMouseEnter={(event) => {
            hovered.set(true);
            local.onHoverStart?.(event);
          }}
          onMouseLeave={(event) => {
            hovered.set(false);
            local.onHoverEnd?.(event);
          }}
          onPressDown={(event) => {
            pressed.set(true);
            if (isKeyboardPress(event)) modality.setKeyboardModality();
            else modality.setPointerModality();
          }}
          onPressUp={() => pressed.set(false)}
          onPress={(event: PressEvent) => {
            local.onPress?.(event);
            if (isKeyboardPress(event)) modality.setKeyboardModality();
            else modality.setPointerModality();

            if (unavailable()) return;
            if (state.isReadOnly) {
              state.setFocusedDate(date);
              state.setFocused(true);
              return;
            }
            state.selectDate(date);
            state.setFocusedDate(date);
            state.setFocused(true);
          }}
        >
          {child}
        </View>
      </View>
    </CalendarCellContext.Provider>
  );
}
