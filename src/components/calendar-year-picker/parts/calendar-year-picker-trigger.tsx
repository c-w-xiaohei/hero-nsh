import type { Accessor, JSX, PressEvent, ViewProps } from "nsh";
import { split, View } from "nsh";
import type { CalendarYearPickerVariants } from "../calendar-year-picker.styles";
import { calendarYearPickerVariants } from "../calendar-year-picker.styles";
import { useYearPicker } from "../year-picker-context";
import { CalendarYearPickerTriggerContext } from "./calendar-year-picker-trigger-context";

export interface CalendarYearPickerTriggerRenderProps {
  isOpen: Accessor<boolean>;
  monthYear: Accessor<string>;
  toggle: () => void;
}
export interface CalendarYearPickerTriggerProps extends Omit<ViewProps, "children" | "class" | "onPress">, CalendarYearPickerVariants {
  children: JSX.Element | ((values: CalendarYearPickerTriggerRenderProps) => JSX.Element);
  className?: string;
  onPress?: (event: PressEvent) => void;
  onKeyDown?: (event: unknown) => void;
  ref?: (node: import("nsh").ViewRef) => void;
}
export function CalendarYearPickerTrigger(props: CalendarYearPickerTriggerProps): JSX.Element {
  const context = useYearPicker();
  const monthYear: Accessor<string> = () => "";
  const isOpen = context.isYearPickerOpen;
  const toggle = () => context.setIsYearPickerOpen(!isOpen());
  const [local, rest] = split(props, ["children", "className", "onPress", "onKeyDown", "ref"]);
  const classes = calendarYearPickerVariants();
  const values: CalendarYearPickerTriggerRenderProps = { isOpen, monthYear, toggle };
  const children = local.children;
  return (
    <CalendarYearPickerTriggerContext.Provider value={values}>
      <View
        {...rest}
        ref={(node) => local.ref?.(node)}
        class={`${classes.trigger()} ${local.className ?? ""}`}
        role="button"
        focusable
        accessibilityLabel={`${monthYear()}, year selector`}
        accessibilityState={{ expanded: isOpen() }}
        onPress={(event: PressEvent) => {
          local.onPress?.(event);
          toggle();
        }}
      >
        {typeof children === "function" ? children(values) : children}
      </View>
    </CalendarYearPickerTriggerContext.Provider>
  );
}
