import type { JSX, MouseEvent as NshMouseEvent, PressEvent, ViewProps, ViewRef } from "nsh";
import { computed, effect, signal, split, Text, View } from "nsh";
import type { CalendarDate } from "@internationalized/date";
import { DateFormatter, isSameDay, isSameMonth, isToday } from "@internationalized/date";

import {
  createInteractionModality,
  isKeyboardPress,
} from "../../primitives/create-interaction-modality";
import { renderChildren } from "../calendar/children";
import type { CalendarCellRenderProps } from "../calendar/calendar-context";
import {
  RangeCalendarCellContext,
  RangeCalendarGridContext,
  RangeCalendarRowContext,
  useRangeCalendarContext,
} from "./range-calendar-context";

export interface RangeCalendarCellProps
  extends Omit<ViewProps, "children" | "class" | "onPress" | "ref"> {
  /** The date this cell shows; required. */
  date: CalendarDate;

  /** Nodes, or a function called once with the cell's state accessors (the
   * same 15 fields as `Calendar.Cell`). */
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

/**
 * The round button inside the track (R-028). HeroUI has no slot for
 * `.range-calendar__cell-button` (it is a literal span upstream), so its class
 * is a module constant here and the variant table keeps its twelve slots 1:1
 * (port sheet §5).
 *
 * R-003 / R-004: the week view and the day view size the cell
 * `aspect-square w-full`, which is the declaration the month view's button
 * already carries, so one branch-less constant serves all views (§4c).
 * R-029 (`-webkit-tap-highlight-color`) and R-030 (`scale 200ms`,
 * `transform-gpu`, `will-change`) are deleted: the host has neither, and
 * motion is not part of this phase.
 */
const cellButtonClass =
  "flex aspect-square w-full items-center justify-center rounded-3xl text-sm font-medium text-foreground";

function eraFormat(date: CalendarDate): "short" | undefined {
  return date.calendar.identifier === "gregory" && date.era === "BC" ? "short" : undefined;
}

/**
 * `RangeCalendar.Cell`: one day — `td[role=cell]` > the focusable track
 * (`div.range-calendar__cell`, R-025/R-026) > the round button
 * (`.range-calendar__cell-button`, R-028) > the content (port sheet §3).
 *
 * The track draws the range and its rounding (R-034…R-036, R-039/R-040,
 * R-043/R-044, R-047/R-048, R-054/R-055); the button draws the day itself, the
 * focus ring and the caps' solid accent (R-031…R-033, R-037, R-041, R-042).
 * The rounding needs the neighbours in the week row, which upstream reads with
 * `:first-child` / `:has()` / sibling selectors; NSH has none, so `GridBody`
 * registers the four row values in `RangeCalendarRowContext` (§3). A cell
 * rendered outside a row (no provider) is "not first, not last, no
 * outside-month neighbour", like upstream's element without a `td`.
 */
export function RangeCalendarCell(props: RangeCalendarCellProps): JSX.Element {
  const { state, slots, isYearPickerOpen } = useRangeCalendarContext();
  const grid = RangeCalendarGridContext();
  const row = RangeCalendarRowContext();
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

  // R-035/R-036 and R-047/R-048 read the cell's place in its week row; without
  // a row provider the cell behaves as a middle cell (§3).
  const column = row?.column ?? -1;
  const columnCount = row?.columnCount ?? 7;
  const previousOutsideMonth = row?.previousOutsideMonth ?? false;
  const nextOutsideMonth = row?.nextOutsideMonth ?? false;
  const isRowStart = column === 0;
  const isRowEnd = columnCount > 0 && column === columnCount - 1;

  let node: ViewRef | undefined;

  // RAC derives `data-outside-month` from the grid's start month in every view,
  // not only the month view; the week/day sizing rules do not override the
  // dimming (R-043). Without a grid the visible range's start month is the
  // closest equivalent.
  const outsideMonth = computed(
    () => !isSameMonth(grid ? grid.startDate() : state.visibleRange().start, date),
  );
  const disabled = computed(() => state.isCellDisabled(date));
  const unavailable = computed(() => state.isCellUnavailable(date));
  const selected = computed(() => state.isSelected(date));
  const selectionStart = computed(() => state.isSelectionStart(date));
  const selectionEnd = computed(() => state.isSelectionEnd(date));
  const focused = computed(() => state.isCellFocused(date));
  const focusVisible = computed(() => focused() && modality.isKeyboard());
  const today = computed(() => isToday(date, state.timeZone));
  const isCap = computed(() => selectionStart() || selectionEnd());
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
    isSelectionStart: selectionStart,
    isSelectionEnd: selectionEnd,
    isFocused: focused,
    isFocusVisible: focusVisible,
    isDisabled: disabled,
    isOutsideVisibleRange: outsideVisibleRange,
    isOutsideMonth: outsideMonth,
    isUnavailable: unavailable,
    isInvalid: invalid,
    isToday: today,
  };

  // Left rounding of the range track (R-035, R-039, R-047, R-054): 8px at the
  // row's left edge or beside an outside-month day, 24px at the range's start.
  // R-038 is upstream's commented-out `&[data-selection-start]:has(+
  // [data-selection-end]) { rounded-full }`: it never applied, so it is not
  // ported and a one-day range keeps the caps' 24px corners.
  // R-047's nested `&[data-outside-month]` restores 24px on an outside-month
  // middle cell, which is the base radius, so nothing is emitted there.
  const leftRadius = () =>
    // R-039 / R-054: a start cap's left end is always 24px, whether the row
    // begins there or an outside-month day precedes it.
    selectionStart()
      ? "rounded-ss-3xl rounded-es-3xl"
      : !selected()
        ? ""
        : previousOutsideMonth && outsideMonth()
          ? ""
          : // R-035 (row start) / R-047 (preceded by an outside-month day).
            isRowStart || previousOutsideMonth
            ? "rounded-ss-lg rounded-es-lg"
            : "";

  // Right rounding, the mirror image (R-036, R-040, R-048, R-055).
  const rightRadius = () =>
    selectionEnd()
      ? "rounded-se-3xl rounded-ee-3xl"
      : !selected()
        ? ""
        : nextOutsideMonth && outsideMonth()
          ? ""
          : isRowEnd || nextOutsideMonth
            ? "rounded-se-lg rounded-ee-lg"
            : "";

  const trackClasses = () =>
    `${
      // R-025: track shape, R-026: interactive cursor. `w-full` and the deleted
      // `mx-0` are the slot's own business (§6.1).
      slots.cell()
    } ${
      // R-031: the focus ring is drawn on the button; the track only steps its
      // z-index up so the ring is not clipped by its neighbours.
      focusVisible() ? "z-2" : ""
    } ${
      // R-034: the middle of a range is a square-ended track in the soft accent.
      selected() && !outsideMonth() ? "rounded-none bg-accent-soft" : ""
    } ${leftRadius()} ${rightRadius()} ${
      // R-037: a cap sits above the track so its solid circle meets both
      // neighbours flush.
      isCap() && !outsideMonth() ? "z-2" : ""
    } ${
      // R-043: an outside-month day is muted and half transparent.
      outsideMonth() ? "text-muted opacity-50" : ""
    } ${
      // R-044: a selected outside-month day keeps a faint track.
      selected() && outsideMonth() && !isCap() ? "bg-default/20" : ""
    } ${
      // R-045: an unavailable day cannot be pressed.
      unavailable() ? "opacity-50 cursor-not-allowed pointer-events-none" : ""
    } ${
      // R-046: a disabled day inside this month is struck through.
      disabled() && !outsideMonth() ? "opacity-50 cursor-not-allowed pointer-events-none line-through" : ""
    } ${
      // R-020: a read-only calendar keeps focus but takes no pointer press.
      state.isReadOnly ? "pointer-events-none" : ""
    } ${local.className ?? ""}`;

  const buttonClasses = () =>
    `${cellButtonClass} ${
      // R-031: `status-focused` — a 2pt ring with a 2pt page-coloured offset,
      // on the round button only (the same translation as `Calendar.Cell`).
      focusVisible() ? "ring-2 ring-focus ring-offset-2 ring-offset-background" : ""
    } ${
      // R-032: today's soft accent fill.
      today() ? "bg-accent-soft text-accent-soft-foreground" : ""
    } ${
      // R-033: today's hover, only while the day is not selected.
      !selected() && today() ? "hover:bg-accent-soft-hover" : ""
    } ${
      // R-037: the caps' solid accent circle (and the calendar's only place
      // that paints the accent foreground on a day number).
      isCap() && !outsideMonth() ? "bg-accent text-accent-foreground" : ""
    } ${
      // R-041: the button shrinks while pressed; a cap holds the accent hover
      // paint. Pressed looks are verified by class, not by screenshot (§4c).
      "active:scale-90"
    } ${isCap() ? "active:bg-accent-hover" : ""} ${
      // R-042: a plain day lightens on hover. R-033 and R-042 are mutually
      // exclusive upstream; emitting one keeps them from overwriting each
      // other in NSH's class layer (skill rule 4). Upstream gates both behind
      // `(hover: hover)`, which the host cannot express (§8).
      !selected() && !today() ? "hover:bg-default" : ""
    }`;

  // The children prop is read exactly once, at its placement inside the
  // provider (`_common` component rules): a `computed` built here would be
  // created outside `RangeCalendarCellContext` and the indicator would lose
  // it.
  const resolveContent = (children: RangeCalendarCellProps["children"]) => {
    if (typeof children === "function") return renderChildren(children(values));
    return renderChildren(
      children ?? (
        <Text
          // The track's `line-through` does not reach a nested `Text`, so the
          // default label repeats it (R-046).
          class={disabled() && !outsideMonth() ? "line-through" : ""}
        >
          {formattedDate}
        </Text>
      ),
    );
  };

  return (
    // R-050: the indicator inside this cell takes the selected paint from here.
    <RangeCalendarCellContext.Provider value={{ isSelected: selected }}>
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
          focusable={isTabStop() && !isYearPickerOpen()}
          disabled={disabled()}
          accessibilityLabel={accessibilityLabel()}
          accessibilityState={{
            selected: selected(),
            disabled: disabled() || unavailable(),
          }}
          class={trackClasses()}
          onFocus={() => {
            local.onFocus?.();
            modality.onFocus();
            grid?.onCellFocus(date);
          }}
          onBlur={() => {
            local.onBlur?.();
            grid?.onCellBlur();
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
            // One press starts a range (or closes a one-day one), the next
            // completes it — the state owns that two-step behavior (§2.1).
            state.selectDate(date);
            state.setFocusedDate(date);
            state.setFocused(true);
          }}
        >
          <View class={buttonClasses()}>{resolveContent(local.children)}</View>
        </View>
      </View>
    </RangeCalendarCellContext.Provider>
  );
}
