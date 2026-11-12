import type { JSX, ViewProps, ViewRef } from "nsh";
import { split, View } from "nsh";

import { renderChildren } from "../calendar/children";
import { useRangeCalendarContext } from "./range-calendar-context";

export interface RangeCalendarHeaderProps extends Omit<ViewProps, "children" | "class" | "ref"> {
  children?: JSX.Element;
  className?: string;
  ref?: (node: ViewRef) => void;
}

/**
 * `RangeCalendar.Header`: the row above the date grid (R-008).
 *
 * Upstream's `:has(.calendar-year-picker__trigger[data-open="true"])` rule
 * (R-009) fades the two nav buttons from here; NSH has no `:has()` and no
 * descendant selectors, so the header is layout only and the `NavButton` parts
 * read the year panel's open state from `YearPickerContext` themselves.
 */
export function RangeCalendarHeader(props: RangeCalendarHeaderProps): JSX.Element {
  const { slots } = useRangeCalendarContext();
  const [local, rest] = split(props, ["children", "className", "ref"]);

  return (
    <View
      {...rest}
      ref={(node) => local.ref?.(node)}
      class={`${slots.header()} ${local.className ?? ""}`}
    >
      {renderChildren(local.children)}
    </View>
  );
}
