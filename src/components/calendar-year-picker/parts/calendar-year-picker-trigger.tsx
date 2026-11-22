import type { Accessor, JSX, PressEvent, ViewProps, ViewRef } from "nsh";
import { createAnimatedValue, signal, split, View } from "nsh";

import { renderChildren } from "../../calendar/children";

import { useCalendarOrRangeState } from "../../calendar/calendar-context";
import { createInput } from "../../../primitives/environment";
import {
  createInteractionModality,
  isKeyboardPress,
} from "../../../primitives/create-interaction-modality";
import { createKeymapScope } from "../../../primitives/create-keymap-scope";
import {
  createPressFeedback,
  PressableFeedbackContext,
} from "../../../primitives/pressable";
import type { PressableFeedbackContextValue } from "../../../primitives/pressable";
import { formatCalendarHeading } from "../../calendar/date-utils";
import { useYearPicker } from "../../calendar/year-picker-context";
import { calendarYearPickerVariants } from "../calendar-year-picker.styles";
import { CalendarYearPickerTriggerContext } from "./calendar-year-picker-trigger-context";

export interface CalendarYearPickerTriggerRenderProps {
  isOpen: Accessor<boolean>;
  monthYear: Accessor<string>;
  toggle: () => void;
}

export interface CalendarYearPickerTriggerProps
  extends Omit<ViewProps, "children" | "class" | "onPress" | "ref"> {
  children: JSX.Element | ((values: CalendarYearPickerTriggerRenderProps) => JSX.Element);
  className?: string;
  onPress?: (event: PressEvent) => void;

  /** Accepted, no effect: NSH has no key-down event; Escape is bound instead. */
  onKeyDown?: (event: unknown) => void;

  /** Blocks the trigger. */
  isDisabled?: boolean;

  ref?: (node: ViewRef) => void;
}

/**
 * `Calendar.YearPickerTrigger`: the month-year button. It replaces
 * `Calendar.Heading` in the header and toggles the year panel.
 */
export function CalendarYearPickerTrigger(props: CalendarYearPickerTriggerProps): JSX.Element {
  const yearPicker = useYearPicker();
  const state = useCalendarOrRangeState();
  const [local, rest] = split(props, [
    "children",
    "className",
    "onPress",
    "onPressDown",
    "onPressUp",
    "onKeyDown",
    "onLayout",
    "isDisabled",
    "ref",
  ]);

  const input = createInput();
  const slots = calendarYearPickerVariants({ input: input() });
  const modality = createInteractionModality();
  const focused = signal(false);

  // A-003: the press-feedback seam, gated on `input() === "touch"` and the
  // disabled flag — under a pointer environment it is a physical no-op, so
  // the desktop event chain below is untouched.
  const feedback = createPressFeedback({
    enabled: () => input() === "touch" && local.isDisabled !== true,
  });

  // A-005: the seam's read half for consumers — the canonical channels plus
  // the computed hitSlop, sampled by the fixture's `CtxProbe` (A-008:
  // `harness/calendar-year-picker.fixtures.tsx` mounts this seam under the
  // `Scoped`/`mobile` case, A-009: the two `.mobile.` test files drive it).
  // No Highlight/Ripple/Scale overlay mounts by default (sheet §8: upstream's
  // year panel has no press-visual contract); a caller that wants one
  // composes `<PressableFeedback.Highlight/>` into the trigger's children.
  const feedbackValue: PressableFeedbackContextValue = {
    isPressed: feedback.isPressed,
    pressed: feedback.pressed,
    bounds: feedback.bounds,
    pressOrigin: feedback.pressOrigin,
    scale: feedback.scale,
    highlightOpacity: createAnimatedValue(0),
    rippleProgress: createAnimatedValue(0),
    enabled: () => input() === "touch" && local.isDisabled !== true,
    hitSlop: feedback.hitSlop,
    isAllAnimationsDisabled: () => false,
  };

  const monthYear = () => formatCalendarHeading(state, {});
  const isOpen = yearPicker.isYearPickerOpen;
  const toggle = () => {
    if (local.isDisabled === true) return;
    yearPicker.setIsYearPickerOpen(!isOpen());
  };

  useYearPickerEscape(focused, isOpen, yearPicker.setIsYearPickerOpen);

  const values: CalendarYearPickerTriggerRenderProps = { isOpen, monthYear, toggle };
  const label = () => `${monthYear()}, year selector`;

  return (
    <CalendarYearPickerTriggerContext.Provider value={values}>
      <View
        {...rest}
        ref={(node) => local.ref?.(node)}
        role="button"
        focusable={local.isDisabled !== true}
        disabled={local.isDisabled === true}
        accessibilityLabel={label()}
        accessibilityState={{ expanded: isOpen(), disabled: local.isDisabled === true }}
        class={`${slots.trigger()} ${
          // R-048: focus ring only for keyboard focus; `status-focused` is a
          // 2pt ring with a 2pt page-coloured offset.
          focused() && modality.isKeyboard()
            ? "ring-2 ring-focus ring-offset-2 ring-offset-background"
            : ""
        } ${
          local.isDisabled === true
            ? "opacity-50 cursor-not-allowed pointer-events-none"
            : ""
        } ${local.className ?? ""}`}
        onFocus={() => {
          focused.set(true);
          modality.onFocus();
        }}
        onBlur={() => focused.set(false)}
        // A-003: the caller's `onPressDown`/`onPressUp` chain after the
        // seam's — release and cancel share `onPressUp`, so `pressUp`
        // always resets the seam.
        onPressDown={(event: PressEvent) => {
          feedback.pressDown(event);
          local.onPressDown?.(event);
        }}
        onPressUp={(event: PressEvent) => {
          feedback.pressUp(event);
          local.onPressUp?.(event);
        }}
        // A-003: the view-prop half of the hit area — the seam's computed
        // slop, undefined while gated off or the view is already at target.
        hitSlop={feedback.hitSlop()}
        onLayout={(event) => {
          // A-003: `bounds` feeds `hitSlop` and `scale`, so the seam reads
          // the layout first.
          feedback.layout(event);
          local.onLayout?.(event);
        }}
        onPress={(event: PressEvent) => {
          local.onPress?.(event);
          if (isKeyboardPress(event)) modality.setKeyboardModality();
          else modality.setPointerModality();
          toggle();
        }}
      >
        {/* A-005: `local.children` still resolves exactly once, inside the
            provider so composed press-feedback parts read the context. */}
        <PressableFeedbackContext.Provider value={feedbackValue}>
          {renderChildren(typeof local.children === "function" ? local.children(values) : local.children)}
        </PressableFeedbackContext.Provider>
      </View>
    </CalendarYearPickerTriggerContext.Provider>
  );
}

/** Escape closes an open panel, whether or not the trigger kept the focus. */
function useYearPickerEscape(
  focused: Accessor<boolean>,
  isOpen: Accessor<boolean>,
  setIsYearPickerOpen: (open: boolean) => void,
) {
  createKeymapScope({
    isActive: () => focused() || isOpen(),
    bindings: {
      escape: () => {
        if (isOpen()) setIsYearPickerOpen(false);
      },
    },
  });
}
