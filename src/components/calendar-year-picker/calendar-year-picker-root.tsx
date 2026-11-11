import type { JSX, ViewProps } from "nsh";
import { split, View } from "nsh";

import { calendarYearPickerVariants } from "./calendar-year-picker.styles";

/** CalendarYearPicker's compound namespace; HeroUI uses it as a parts-only API. */
export interface CalendarYearPickerRootProps extends Omit<ViewProps, "children" | "class"> {
  children?: JSX.Element;
  className?: string;
}

/** Structural root for the compound API. Calendar state is provided by its parent calendar. */
export function CalendarYearPickerRoot(props: CalendarYearPickerRootProps): JSX.Element {
  const [local, rest] = split(props, ["children", "className"]);
  const classes = calendarYearPickerVariants();
  return <View {...rest} class={`${classes.trigger()} ${local.className ?? ""}`}>{local.children}</View>;
}
