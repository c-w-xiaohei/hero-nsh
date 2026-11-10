import {
  SelectClearButton,
  type SelectClearButtonProps,
} from "./select-clear-button";
import {
  SelectIndicator,
  type SelectIndicatorProps,
} from "./select-indicator";
import {
  SelectPopover,
  type SelectPopoverProps,
} from "./select-popover";
import {
  SelectRoot,
  type SelectRenderProps,
  type SelectRootProps,
  type SelectSelection,
} from "./select-root";
import {
  SelectTrigger,
  type SelectTriggerProps,
  type SelectTriggerRenderProps,
} from "./select-trigger";
import {
  SelectValue,
  type SelectValueProps,
  type SelectValueRenderProps,
} from "./select-value";

/* -------------------------------------------------------------------------------------------------
 * Compound component
 * -----------------------------------------------------------------------------------------------*/
/**
 * `Select` is HeroUI's compound: the root plus the five parts, each reachable
 * as `Select.Part` and also exported by name.
 */
export const Select = Object.assign(SelectRoot, {
  Root: SelectRoot,
  Trigger: SelectTrigger,
  Value: SelectValue,
  Indicator: SelectIndicator,
  ClearButton: SelectClearButton,
  Popover: SelectPopover,
});

export type Select<T = unknown> = {
  Props: SelectRootProps<T>;
  RootProps: SelectRootProps<T>;
  TriggerProps: SelectTriggerProps;
  ValueProps: SelectValueProps;
  IndicatorProps: SelectIndicatorProps;
  ClearButtonProps: SelectClearButtonProps;
  PopoverProps: SelectPopoverProps;
};

/* -------------------------------------------------------------------------------------------------
 * Named components and their props
 * -----------------------------------------------------------------------------------------------*/
export {
  SelectClearButton,
  SelectIndicator,
  SelectPopover,
  SelectRoot,
  SelectTrigger,
  SelectValue,
};

export type {
  SelectClearButtonProps,
  SelectIndicatorProps,
  SelectPopoverProps,
  SelectRenderProps,
  SelectRootProps,
  SelectRootProps as SelectProps,
  SelectSelection,
  SelectTriggerProps,
  SelectValueProps,
};

export type { SelectPopoverRenderProps } from "./select-popover";
export type { SelectTriggerRenderProps } from "./select-trigger";
export type { SelectValueRenderProps } from "./select-value";
export type {
  SelectSelectedItem,
  SelectStateFacade,
} from "./select-context";

/* -------------------------------------------------------------------------------------------------
 * Variants
 * -----------------------------------------------------------------------------------------------*/
export { selectVariants } from "./select.styles";

export type { SelectVariants } from "./select.styles";
