import type { Accessor, JSX, PressEvent, ViewProps, ViewRef } from "nsh";
import { signal, split, View } from "nsh";

import { renderChildren } from "../../calendar/children";

import { useCalendarOrRangeState } from "../../calendar/calendar-context";
import {
  createInteractionModality,
  isKeyboardPress,
} from "../../../primitives/create-interaction-modality";
import { createKeymapScope } from "../../../primitives/create-keymap-scope";
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
    "onKeyDown",
    "isDisabled",
    "ref",
  ]);

  const slots = calendarYearPickerVariants();
  const modality = createInteractionModality();
  const focused = signal(false);

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
          // R-048: focus ring only for keyboard focus.
          focused() && modality.isKeyboard() ? "ring-2 ring-focus" : ""
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
        onPress={(event: PressEvent) => {
          local.onPress?.(event);
          if (isKeyboardPress(event)) modality.setKeyboardModality();
          else modality.setPointerModality();
          toggle();
        }}
      >
        {renderChildren(typeof local.children === "function" ? local.children(values) : local.children)}
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
