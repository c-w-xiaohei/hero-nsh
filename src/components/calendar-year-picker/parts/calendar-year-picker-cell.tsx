import type { Accessor, JSX, PressEvent, ViewProps } from "nsh";
import { computed, split, View } from "nsh";
import type { CalendarYearPickerVariants } from "../calendar-year-picker.styles";
import { calendarYearPickerVariants } from "../calendar-year-picker.styles";
import { YearGridContext } from "./calendar-year-picker-grid";

export interface CalendarYearPickerCellRenderProps {
  year: Accessor<number>;
  formattedYear: Accessor<string>;
  isSelected: Accessor<boolean>;
  isCurrentYear: Accessor<boolean>;
  isOpen: Accessor<boolean>;
  selectYear: () => void;
}
export interface CalendarYearPickerCellProps extends Omit<ViewProps, "children" | "class" | "onPress">, CalendarYearPickerVariants {
  className?: string;
  year: number;
  children?: JSX.Element | ((values: CalendarYearPickerCellRenderProps) => JSX.Element);
  excludeFromTabOrder?: boolean;
  onFocus?: () => void;
  onPress?: (event: PressEvent) => void;
  ref?: (node: import("nsh").ViewRef) => void;
}
export function CalendarYearPickerCell(props: CalendarYearPickerCellProps): JSX.Element {
  const [local, rest] = split(props, ["year", "children", "excludeFromTabOrder", "className", "onFocus", "onPress", "ref"]);
  const grid = YearGridContext();
  if (!grid) throw new Error("CalendarYearPickerCell must be used inside CalendarYearPickerGrid.");
  const values = grid.yearData(local.year);
  const selected = values.isSelected;
  const child = typeof local.children === "function" ? local.children(values) : local.children;
  const slot = calendarYearPickerVariants();
  const classes = computed(() =>
    // R-016: preserve compact inline sizing in NSH.
    // R-019 and R-021: nonselected/selected hover states; hover-media query is unavailable.
    // R-020: selected year paint; R-022's focus ring is not expressible without modality state.
    `${slot.yearCell()} ${selected() ? "bg-accent text-accent-foreground" : "hover:bg-default hover:text-default-foreground"} ${local.className ?? ""}`,
  );
  return (
    <View
      {...rest}
      ref={(node) => local.ref?.(node)}
      role="button"
      accessibilityState={{ selected: selected() }}
      focusable={!local.excludeFromTabOrder && selected()}
      class={classes()}
      onFocus={local.onFocus}
      onPress={(event: PressEvent) => {
        local.onPress?.(event);
        values.selectYear();
      }}
    >
      {child ?? values.formattedYear()}
    </View>
  );
}
