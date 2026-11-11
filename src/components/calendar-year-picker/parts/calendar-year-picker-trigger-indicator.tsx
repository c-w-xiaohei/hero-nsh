import type { JSX, ViewProps, ViewRef } from "nsh";
import { split, View } from "nsh";

import { IconChevronRight } from "../../icons";
import { calendarYearPickerVariants } from "../calendar-year-picker.styles";
import type { CalendarYearPickerTriggerRenderProps } from "./calendar-year-picker-trigger";
import { useCalendarYearPickerTriggerContext } from "./calendar-year-picker-trigger-context";

export interface CalendarYearPickerTriggerIndicatorProps
  extends Omit<ViewProps, "children" | "class" | "ref"> {
  children?: JSX.Element | ((values: CalendarYearPickerTriggerRenderProps) => JSX.Element);
  className?: string;
  ref?: (node: ViewRef) => void;
}

/** `Calendar.YearPickerTriggerIndicator`: the chevron that turns when open. */
export function CalendarYearPickerTriggerIndicator(
  props: CalendarYearPickerTriggerIndicatorProps,
): JSX.Element {
  const values = useCalendarYearPickerTriggerContext();
  const [local, rest] = split(props, ["children", "className", "ref"]);
  const slots = calendarYearPickerVariants();

  const child =
    typeof local.children === "function"
      ? local.children(values)
      : (local.children ?? <IconChevronRight />);

  return (
    <View
      {...rest}
      ref={(node) => local.ref?.(node)}
      accessibilityElementsHidden
      class={`${slots.triggerIndicator()} ${
        // R-053: the open rotation overrides R-051 in both directions.
        values.isOpen() ? "rotate-90 rtl:rotate-90" : ""
      } ${local.className ?? ""}`}
    >
      {child}
    </View>
  );
}
