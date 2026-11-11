import type { JSX, PressEvent, ViewProps, ViewRef } from "nsh";
import { cleanup, split, Text, View } from "nsh";

import { createInteractionModality } from "../../../primitives/create-interaction-modality";
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
    "ref",
  ]);

  const slots = calendarYearPickerVariants();
  const modality = createInteractionModality();
  const year = local.year;
  const isSelected = () => grid.isSelected(year);
  const isActive = () => grid.activeYear() === year;
  const formattedYear = () => grid.formattedYear(year);

  cleanup(() => grid.unregisterCell(year));

  const values: CalendarYearPickerCellRenderProps = {
    year: () => year,
    formattedYear,
    isSelected,
    isCurrentYear: () => year === grid.currentYear(),
    isOpen: grid.isOpen,
    selectYear: () => grid.selectYear(year),
  };

  const child =
    typeof local.children === "function"
      ? local.children(values)
      : (local.children ?? <Text>{formattedYear()}</Text>);

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
        // R-068: focus ring only for keyboard focus.
        grid.isOpen() && isActive() && modality.isKeyboard() ? "ring-2 ring-focus" : ""
      } ${
        // R-066: selected year paint.
        isSelected() ? "bg-accent text-accent-foreground" : ""
      } ${
        // R-067: the selected year darkens on hover.
        isSelected() ? "hover:bg-accent-hover" : ""
      } ${
        // R-065: unselected years hover on the default paint.
        !isSelected() ? "hover:bg-default hover:text-default-foreground" : ""
      } ${local.className ?? ""}`}
      onFocus={() => {
        local.onFocus?.();
        modality.onFocus();
        grid.onCellFocus(year);
      }}
      onBlur={() => grid.onCellBlur()}
      onPress={(event: PressEvent) => {
        local.onPress?.(event);
        if (event.pagePosition.x === 0 && event.pagePosition.y === 0) {
          modality.setKeyboardModality();
        } else {
          modality.setPointerModality();
        }
        grid.selectYear(year);
      }}
    >
      {child}
    </View>
  );
}
