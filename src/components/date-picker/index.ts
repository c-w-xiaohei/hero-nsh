import type { DatePickerRenderProps } from "./date-picker-context";
import {
  DatePickerPopover,
  type DatePickerPopoverProps,
  type DatePickerPopoverRenderProps,
} from "./date-picker-popover";
import { DatePickerRoot, type DatePickerRootProps } from "./date-picker-root";
import {
  DatePickerTrigger,
  type DatePickerTriggerHoverEvent,
  type DatePickerTriggerProps,
} from "./date-picker-trigger";
import {
  DatePickerTriggerIndicator,
  type DatePickerTriggerIndicatorProps,
} from "./date-picker-trigger-indicator";

/* -------------------------------------------------------------------------------------------------
 * Compound component
 * -----------------------------------------------------------------------------------------------*/

/**
 * `DatePicker` is HeroUI 3.2.7's compound: the root (which is also the
 * component itself) plus the trigger, its indicator and the calendar layer,
 * each reachable as `DatePicker.Part` and also exported by name.
 */
export const DatePicker = Object.assign(DatePickerRoot, {
  Root: DatePickerRoot,
  Trigger: DatePickerTrigger,
  TriggerIndicator: DatePickerTriggerIndicator,
  Popover: DatePickerPopover,
});

export type DatePicker = {
  Props: DatePickerRootProps;
  RootProps: DatePickerRootProps;
  TriggerProps: DatePickerTriggerProps;
  TriggerIndicatorProps: DatePickerTriggerIndicatorProps;
  PopoverProps: DatePickerPopoverProps;
};

/* -------------------------------------------------------------------------------------------------
 * Named components and their props
 * -----------------------------------------------------------------------------------------------*/
export {
  DatePickerPopover,
  DatePickerRoot,
  DatePickerTrigger,
  DatePickerTriggerIndicator,
};

export type {
  DatePickerPopoverProps,
  DatePickerPopoverRenderProps,
  DatePickerRenderProps,
  DatePickerRootProps,
  DatePickerRootProps as DatePickerProps,
  DatePickerTriggerHoverEvent,
  DatePickerTriggerIndicatorProps,
  DatePickerTriggerProps,
};

/* -------------------------------------------------------------------------------------------------
 * Variants
 * -----------------------------------------------------------------------------------------------*/
export { datePickerVariants } from "./date-picker.styles";

export type { DatePickerVariants } from "./date-picker.styles";
