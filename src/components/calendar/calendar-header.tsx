import type { JSX, ViewProps, ViewRef } from "nsh";
import { split, View } from "nsh";

import { useCalendarContext } from "./calendar-context";

export interface CalendarHeaderProps extends Omit<ViewProps, "children" | "class" | "ref"> {
  children?: JSX.Element;
  className?: string;
  ref?: (node: ViewRef) => void;
}

/** `Calendar.Header`: the row above the date grid. */
export function CalendarHeader(props: CalendarHeaderProps): JSX.Element {
  const { slots } = useCalendarContext();
  const [local, rest] = split(props, ["children", "className", "ref"]);

  return (
    <View
      {...rest}
      ref={(node) => local.ref?.(node)}
      class={`${slots.header()} ${local.className ?? ""}`}
    >
      {local.children}
    </View>
  );
}
