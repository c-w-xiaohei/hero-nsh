import type { JSX, PressEvent, ViewProps, ViewRef } from "nsh";
import { signal, split, View } from "nsh";

import { IconChevronLeft, IconChevronRight } from "../icons";
import {
  createInteractionModality,
  isKeyboardPress,
} from "../../primitives/create-interaction-modality";
import { useCalendarContext } from "./calendar-context";
import { useYearPicker } from "./year-picker-context";

export interface CalendarNavButtonProps extends Omit<ViewProps, "children" | "class" | "onPress" | "ref"> {
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
 * `Calendar.NavButton`: one page back or forward. Upstream's default children
 * are a chevron; a caller's children replace it.
 */
export function CalendarNavButton(props: CalendarNavButtonProps): JSX.Element {
  const { state, slots } = useCalendarContext();
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

  const rangeDisabled = () =>
    local.slot === "previous"
      ? state.isPreviousVisibleRangeInvalid()
      : local.slot === "next"
        ? state.isNextVisibleRangeInvalid()
        : false;
  const disabled = () => local.isDisabled === true || rangeDisabled();

  const label = local.slot === "previous" ? "Previous" : "Next";

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
      // R-014: hover paint; R-015: pressed scale.
      class={`${slots.navButton()} hover:bg-default hover:text-accent-soft-foreground active:scale-[0.95] ${
        // R-009: while the year panel is open the header hides its nav buttons.
        yearPicker.isYearPickerOpen() ? "pointer-events-none opacity-0" : ""
      } ${
        // R-017: disabled look.
        disabled() ? "opacity-50 cursor-not-allowed pointer-events-none" : ""
      } ${
        // R-016: focus ring only for keyboard focus.
        focused() && modality.isKeyboard() ? "ring-2 ring-focus" : ""
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
      {local.children ??
        (local.slot === "previous" ? (
          <IconChevronLeft className={slots.navButtonIcon()} />
        ) : (
          <IconChevronRight className={slots.navButtonIcon()} />
        ))}
    </View>
  );
}
