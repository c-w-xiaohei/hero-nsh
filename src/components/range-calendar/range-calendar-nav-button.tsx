import type { JSX, PressEvent, ViewProps, ViewRef } from "nsh";
import { split, View } from "nsh";

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
 * STUB for the core phase (port sheet §6): the public props type is final, the
 * body is a placeholder. The real part adds the chevron, the accessibility
 * label, the range-bound disabling, R-009's fade while the year panel is open,
 * R-016's keyboard-only ring and R-017's disabled look.
 */
export function RangeCalendarNavButton(props: RangeCalendarNavButtonProps): JSX.Element {
  const { slots } = useRangeCalendarContext();
  const [local, rest] = split(props, [
    "slot",
    "children",
    "className",
    "isDisabled",
    "onPress",
    "ref",
  ]);
  const child = typeof local.children === "function" ? null : renderChildren(local.children as JSX.Element);

  return (
    <View
      {...rest}
      ref={(node) => local.ref?.(node)}
      class={`${slots.navButton()} ${local.className ?? ""}`}
    >
      {child}
    </View>
  );
}
