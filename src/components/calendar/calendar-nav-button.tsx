import type { JSX, PressEvent, ViewProps, ViewRef } from "nsh";
import { cleanup, signal, split, View } from "nsh";

import { IconChevronLeft, IconChevronRight } from "../icons";
import {
  createInteractionModality,
  isKeyboardPress,
} from "../../primitives/create-interaction-modality";
import { createInput } from "../../primitives/environment";
import { createPressFeedback } from "../../primitives/pressable";
import { useCalendarContext, CalendarDefaultsContext, type CalendarNavSlot } from "./calendar-context";
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
  const { state, slots, setNavButtonFeedback } = useCalendarContext();
  const yearPicker = useYearPicker();
  // R-028 / R-029: a picker's layer cancels the chevron's right-to-left flip
  // (`.date-picker__popover .calendar__nav-button-icon { rotate: 0 }`). A
  // descendant selector has no NSH counterpart, so the class comes from the
  // enclosing picker through this context.
  const defaults = CalendarDefaultsContext();

  const iconClass = () => {
    const own = slots.navButtonIcon();
    const extra = defaults?.navButtonIconClass?.() ?? "";

    return extra.length > 0 ? `${own} ${extra}` : own;
  };
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
  const input = createInput();

  const rangeDisabled = () =>
    local.slot === "previous"
      ? state.isPreviousVisibleRangeInvalid()
      : local.slot === "next"
        ? state.isNextVisibleRangeInvalid()
        : false;
  const disabled = () => local.isDisabled === true || rangeDisabled();

  // A-003: the touch-only press-feedback seam. `hitSlop` is the invisible
  // half of the hit-area path (the visible half is the `input` axis's
  // `size-11`); no `scale`/`highlight`/`ripple` is bound — the press look
  // stays the base's `active:scale-[0.95]`. `enabled` folds `disabled` in so
  // a blocked button (prop or range edge) expands nothing.
  const feedbackEnabled = () => input() === "touch" && !disabled();
  const feedback = createPressFeedback({ enabled: feedbackEnabled });

  // The seam's channels go through the context so a fixture can read the
  // computed `hitSlop` — a view prop `nsh/test` cannot observe (sheet §6).
  // `local.slot` is a static prop, so it keys the registration directly.
  const navSlot = (): CalendarNavSlot => local.slot === "previous" ? "previous" : "next";
  setNavButtonFeedback(navSlot(), {
    isPressed: feedback.isPressed,
    bounds: feedback.bounds,
    pressOrigin: feedback.pressOrigin,
    hitSlop: feedback.hitSlop,
    enabled: feedbackEnabled,
  });
  cleanup(() => setNavButtonFeedback(navSlot(), undefined));

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
      // R-014's hover paint lives in the styles table's `input` axis (A-001):
      // the pointer cell carries both `hover:` classes so a touch host never
      // resolves them — web's sticky hover would otherwise paint the button
      // after a press. R-015: pressed scale stays on the view.
      class={`${slots.navButton()} active:scale-[0.95] ${
        // R-009: while the year panel is open the header hides its nav buttons.
        yearPicker.isYearPickerOpen() ? "pointer-events-none opacity-0" : ""
      } ${
        // R-017: disabled look.
        disabled() ? "opacity-50 cursor-not-allowed pointer-events-none" : ""
      } ${
        // R-016: focus ring only for keyboard focus; `status-focused` is a
        // 2pt ring with a 2pt page-coloured offset.
        focused() && modality.isKeyboard() ? "ring-2 ring-focus ring-offset-2 ring-offset-background" : ""
      } ${local.className ?? ""}`}
      onFocus={() => {
        focused.set(true);
        modality.onFocus();
      }}
      onBlur={() => {
        focused.set(false);
      }}
      // A-003: the seam's press edges and layout feed `isPressed`/`hitSlop`;
      // caller handlers still fire, with the layout callback last (sheet §2).
      onPressDown={(event) => {
        feedback.pressDown(event);
        rest.onPressDown?.(event);
      }}
      onPressUp={(event) => {
        feedback.pressUp(event);
        rest.onPressUp?.(event);
      }}
      onLayout={(event) => {
        feedback.layout(event);
        rest.onLayout?.(event);
      }}
      // A-003: the seam's computed hitSlop is the default writer of this view
      // prop; a caller's own value still wins, as ViewProps passthrough.
      hitSlop={rest.hitSlop ?? feedback.hitSlop()}
      onPress={activate}
    >
      {local.children ??
        (local.slot === "previous" ? (
          // A Canvas icon cannot read the ancestor's `text-*`, so the nav
          // color is passed as a token.
          <IconChevronLeft className={iconClass()} color="accent-soft-foreground" />
        ) : (
          <IconChevronRight className={iconClass()} color="accent-soft-foreground" />
        ))}
    </View>
  );
}
