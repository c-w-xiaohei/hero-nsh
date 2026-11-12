import type { JSX, PressEvent, ViewProps, ViewRef } from "nsh";
import { signal, split, View } from "nsh";

import { IconChevronLeft, IconChevronRight } from "../icons";
import {
  createInteractionModality,
  isKeyboardPress,
} from "../../primitives/create-interaction-modality";
import { CalendarDefaultsContext } from "../calendar/calendar-context";
import { useYearPicker } from "../calendar/year-picker-context";
import { renderChildren } from "../calendar/children";
import { useRangeCalendarContext } from "./range-calendar-context";

export interface RangeCalendarNavButtonProps
  extends Omit<ViewProps, "children" | "class" | "onPress" | "ref"> {
  /** Which way it moves: `previous` or `next`; the chevron follows it. */
  slot?: "previous" | "next";

  children?: JSX.Element;
  className?: string;

  /** Blocks this button on top of the calendar's range bounds. */
  isDisabled?: boolean;

  onPress?: (event: PressEvent) => void;
  ref?: (node: ViewRef) => void;
}

/**
 * `RangeCalendar.NavButton`: one page back or forward (R-011…R-018).
 *
 * Upstream's `Button` receives React Aria's `prevButtonProps` / `nextButtonProps`
 * through the root's `ButtonContext`: a `Previous` / `Next` label, the paging
 * action and `isDisabled` while that page is out of the calendar's bounds.
 * NSH has no slot-based prop context, so the part reads the range state itself.
 */
export function RangeCalendarNavButton(props: RangeCalendarNavButtonProps): JSX.Element {
  const { state, slots } = useRangeCalendarContext();
  // R-009: the header fades both nav buttons while a year panel is open.
  // Upstream reaches them with `:has()`, which NSH does not have.
  const yearPicker = useYearPicker();
  const [local, rest] = split(props, [
    "slot",
    "children",
    "className",
    "isDisabled",
    "onPress",
    "ref",
  ]);

  const modality = createInteractionModality();
  const focused = signal(false);

  // R-030: a picker's layer cancels the chevron's right-to-left flip
  // (`.date-range-picker__popover .range-calendar__nav-button-icon { rotate: 0 }`).
  // A descendant selector has no NSH counterpart, so the class comes from the
  // enclosing picker through this context (port sheet §5, first change).
  const defaults = CalendarDefaultsContext();

  const iconClass = () => {
    const own = slots.navButtonIcon();
    const extra = defaults?.navButtonIconClass?.() ?? "";

    return extra.length > 0 ? `${own} ${extra}` : own;
  };

  const rangeDisabled = () =>
    local.slot === "previous"
      ? state.isPreviousVisibleRangeInvalid()
      : local.slot === "next"
        ? state.isNextVisibleRangeInvalid()
        : false;
  const disabled = () => local.isDisabled === true || rangeDisabled();

  const label = local.slot === "previous" ? "Previous" : "Next";

  // R-012: the four transition groups (`transform` 250ms, `background` 100ms,
  // `box-shadow` 100ms, `opacity` 150ms) plus `will-change: scale` and
  // `transform-gpu` are deleted: NSH allows one duration per transition group
  // and motion is not part of this phase (port sheet §8). State changes at once.
  const activate = (event: PressEvent) => {
    local.onPress?.(event);
    if (isKeyboardPress(event)) modality.setKeyboardModality();
    else modality.setPointerModality();

    if (local.slot === "previous") state.focusPreviousPage();
    else if (local.slot === "next") state.focusNextPage();
  };

  return (
    <View
      {...rest}
      ref={(node) => local.ref?.(node)}
      role="button"
      focusable={!disabled()}
      disabled={disabled()}
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled() }}
      class={`${slots.navButton()} ${
        // R-009: hidden while the year panel covers the calendar.
        yearPicker.isYearPickerOpen() ? "pointer-events-none opacity-0" : ""
      } ${
        // R-017: `status-disabled` is opacity 0.5, a not-allowed cursor and no
        // pointer events.
        disabled() ? "opacity-50 cursor-not-allowed pointer-events-none" : ""
      } ${
        // R-016: `status-focused` (`ring-2 ring-focus` with the theme's ring
        // offset). A view only takes focus from the keyboard, but a pointer
        // press still moves the modality first, so the ring stays keyboard-only.
        focused() && modality.isKeyboard()
          ? "ring-2 ring-focus ring-offset-2 ring-offset-background"
          : ""
      } ${local.className ?? ""}`}
      onFocus={() => {
        focused.set(true);
        modality.onFocus();
      }}
      onBlur={() => {
        focused.set(false);
      }}
      onPress={activate}
    >
      {local.children
        ? renderChildren(local.children)
        : local.slot === "previous"
          ? // A Canvas icon cannot read the ancestor's `text-*`, so the nav color
            // is passed as a token.
            <IconChevronLeft className={iconClass()} color="accent-soft-foreground" />
          : <IconChevronRight className={iconClass()} color="accent-soft-foreground" />}
    </View>
  );
}
