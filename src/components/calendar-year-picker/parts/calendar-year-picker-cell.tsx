import type { JSX, PressEvent, ViewProps, ViewRef } from "nsh";
import { cleanup, createAnimatedValue, split, Text, View } from "nsh";

import { renderChildren } from "../../calendar/children";

import { createInput } from "../../../primitives/environment";
import {
  createInteractionModality,
  isKeyboardPress,
} from "../../../primitives/create-interaction-modality";
import {
  createPressFeedback,
  PressableFeedbackContext,
} from "../../../primitives/pressable";
import type { PressableFeedbackContextValue } from "../../../primitives/pressable";
import type { CalendarYearPickerCellRenderProps } from "./calendar-year-picker-grid";
import { useCalendarYearPickerGridContext } from "./calendar-year-picker-grid";
import { calendarYearPickerVariants } from "../calendar-year-picker.styles";

export interface CalendarYearPickerCellProps
  extends Omit<ViewProps, "children" | "class" | "onPress" | "ref"> {
  /** The year this cell shows; required. A callable marks the active year. */
  year: number;

  children?: JSX.Element | ((values: CalendarYearPickerCellRenderProps) => JSX.Element);

  className?: string;

  /** Keeps this cell out of the Tab order. */
  excludeFromTabOrder?: boolean;

  onFocus?: () => void;
  onPress?: (event: PressEvent) => void;
  ref?: (node: ViewRef) => void;
}

/**
 * `Calendar.YearPickerCell`: one year button. `aria-selected` marks the
 * calendar's focused year, and only the active year joins the Tab order while
 * the panel is open (R-061…R-068).
 */
export function CalendarYearPickerCell(props: CalendarYearPickerCellProps): JSX.Element {
  const grid = useCalendarYearPickerGridContext();
  const [local, rest] = split(props, [
    "year",
    "children",
    "className",
    "excludeFromTabOrder",
    "onFocus",
    "onPress",
    "onPressDown",
    "onPressUp",
    "onLayout",
    "ref",
  ]);

  const input = createInput();
  const slots = calendarYearPickerVariants({ input: input() });
  const modality = createInteractionModality();

  // A-004: the press-feedback seam, gated on `input() === "touch"` — a
  // physical no-op under pointer, so the desktop event chain is untouched.
  const feedback = createPressFeedback({ enabled: () => input() === "touch" });

  // A-005: the seam's read half for consumers (fixture's `CellCtxProbe`). No
  // overlay mounts by default — sheet §8: upstream's year panel carries no
  // press-visual contract, so a caller composes
  // `<PressableFeedback.Highlight/>` into the cell's children when needed.
  const feedbackValue: PressableFeedbackContextValue = {
    isPressed: feedback.isPressed,
    pressed: feedback.pressed,
    bounds: feedback.bounds,
    pressOrigin: feedback.pressOrigin,
    scale: feedback.scale,
    highlightOpacity: createAnimatedValue(0),
    rippleProgress: createAnimatedValue(0),
    enabled: () => input() === "touch",
    hitSlop: feedback.hitSlop,
    isAllAnimationsDisabled: () => false,
  };
  const year = local.year;
  const isSelected = () => grid.isSelected(year);
  const isActive = () => grid.activeYear() === year;
  const formattedYear = () => grid.formattedYear(year);

  cleanup(() => grid.unregisterCell(year));

  const label = formattedYear();
  const values: CalendarYearPickerCellRenderProps = {
    year,
    formattedYear: label,
    isSelected,
    isCurrentYear: () => year === grid.currentYear(),
    isOpen: grid.isOpen,
    selectYear: () => grid.selectYear(year),
  };

  const child =
    typeof local.children === "function"
      ? renderChildren(local.children(values))
      : renderChildren(local.children ?? <Text>{label}</Text>);

  return (
    <View
      {...rest}
      ref={(node) => {
        grid.registerCell(year, node);
        local.ref?.(node);
      }}
      role="button"
      focusable={grid.isOpen() && isActive() && local.excludeFromTabOrder !== true}
      accessibilityLabel={formattedYear()}
      accessibilityState={{ selected: isSelected() }}
      class={`${slots.yearCell()} ${
        // R-068: focus ring only for keyboard focus; `status-focused` is a 2pt
        // ring with a 2pt page-coloured offset.
        grid.isOpen() && isActive() && modality.isKeyboard()
          ? "ring-2 ring-focus ring-offset-2 ring-offset-background"
          : ""
      } ${
        // R-066: selected year paint.
        isSelected() ? "bg-accent text-accent-foreground" : ""
      } ${
        // R-067: the selected year darkens on hover. A-002: emitted only
        // under pointer — touch drops the hover dependency and shields the
        // web's sticky-hover residue; the pointer string is unchanged.
        isSelected() && input() === "pointer" ? "hover:bg-accent-hover" : ""
      } ${
        // R-065: unselected years hover on the default paint (A-002, same
        // pointer gate as above).
        !isSelected() && input() === "pointer"
          ? "hover:bg-default hover:text-default-foreground"
          : ""
      } ${local.className ?? ""}`}
      onFocus={() => {
        local.onFocus?.();
        modality.onFocus();
        grid.onCellFocus(year);
      }}
      onBlur={() => grid.onCellBlur()}
      // A-004: the caller's `onPressDown`/`onPressUp` chain after the
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
      // A-004: the view-prop half of the hit area — the seam's computed
      // slop backstops a custom-sized cell compressed under 44 pt.
      hitSlop={feedback.hitSlop()}
      onLayout={(event) => {
        feedback.layout(event);
        local.onLayout?.(event);
      }}
      onPress={(event: PressEvent) => {
        local.onPress?.(event);
        if (isKeyboardPress(event)) modality.setKeyboardModality();
        else modality.setPointerModality();
        grid.selectYear(year);
      }}
    >
      {/* A-005: the resolved child sits inside the provider so composed
          press-feedback parts read the seam's context. */}
      <PressableFeedbackContext.Provider value={feedbackValue}>
        {child}
      </PressableFeedbackContext.Provider>
    </View>
  );
}
