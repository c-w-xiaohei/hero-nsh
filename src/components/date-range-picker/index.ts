import type {
  DateRangePickerPopoverProps,
  DateRangePickerPopoverRenderProps,
} from "./date-range-picker-popover";
import { DateRangePickerPopover } from "./date-range-picker-popover";
import type { DateRangePickerRenderProps } from "./date-range-picker-context";
import {
  DateRangePickerRangeSeparator,
  type DateRangePickerRangeSeparatorProps,
} from "./date-range-picker-range-separator";
import { DateRangePickerRoot, type DateRangePickerRootProps } from "./date-range-picker-root";
import {
  DateRangePickerTrigger,
  type DateRangePickerTriggerHoverEvent,
  type DateRangePickerTriggerProps,
} from "./date-range-picker-trigger";
import {
  DateRangePickerTriggerIndicator,
  type DateRangePickerTriggerIndicatorProps,
} from "./date-range-picker-trigger-indicator";

/* -------------------------------------------------------------------------------------------------
 * Compound component
 * -----------------------------------------------------------------------------------------------*/

/**
 * `DateRangePicker` is HeroUI 3.2.7's compound: the root (which is also the
 * component itself) plus the trigger, its indicator, the range separator and
 * the calendar layer, each reachable as `DateRangePicker.Part` and also
 * exported by name.
 */
export const DateRangePicker = Object.assign(DateRangePickerRoot, {
  Root: DateRangePickerRoot,
  Trigger: DateRangePickerTrigger,
  TriggerIndicator: DateRangePickerTriggerIndicator,
  RangeSeparator: DateRangePickerRangeSeparator,
  Popover: DateRangePickerPopover,
});

export type DateRangePicker = {
  Props: DateRangePickerRootProps;
  RootProps: DateRangePickerRootProps;
  TriggerProps: DateRangePickerTriggerProps;
  TriggerIndicatorProps: DateRangePickerTriggerIndicatorProps;
  RangeSeparatorProps: DateRangePickerRangeSeparatorProps;
  PopoverProps: DateRangePickerPopoverProps;
};

/* -------------------------------------------------------------------------------------------------
 * Named components and their props
 * -----------------------------------------------------------------------------------------------*/
export {
  DateRangePickerPopover,
  DateRangePickerRangeSeparator,
  DateRangePickerRoot,
  DateRangePickerTrigger,
  DateRangePickerTriggerIndicator,
};

export type {
  DateRangePickerPopoverProps,
  DateRangePickerPopoverRenderProps,
  DateRangePickerRangeSeparatorProps,
  DateRangePickerRenderProps,
  DateRangePickerRootProps,
  DateRangePickerRootProps as DateRangePickerProps,
  DateRangePickerTriggerHoverEvent,
  DateRangePickerTriggerIndicatorProps,
  DateRangePickerTriggerProps,
};

/* -------------------------------------------------------------------------------------------------
 * Variants
 * -----------------------------------------------------------------------------------------------*/
export { dateRangePickerVariants } from "./date-range-picker.styles";

export type { DateRangePickerVariants } from "./date-range-picker.styles";
