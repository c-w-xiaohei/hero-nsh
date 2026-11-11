import {
  ComboBoxInputGroup,
  type ComboBoxInputGroupProps,
} from "./combo-box-input-group";
import {
  ComboBoxPopover,
  type ComboBoxPopoverProps,
} from "./combo-box-popover";
import {
  ComboBoxRoot,
  type ComboBoxRenderProps,
  type ComboBoxRootProps,
  type ComboBoxSelection,
} from "./combo-box-root";
import {
  ComboBoxTrigger,
  type ComboBoxTriggerProps,
} from "./combo-box-trigger";
import { ComboBoxValue, type ComboBoxValueProps } from "./combo-box-value";

/* -------------------------------------------------------------------------------------------------
 * Compound component
 * -----------------------------------------------------------------------------------------------*/
/**
 * `ComboBox` is HeroUI's compound: the root plus the four parts, each reachable
 * as `ComboBox.Part` and also exported by name.
 */
export const ComboBox = Object.assign(ComboBoxRoot, {
  Root: ComboBoxRoot,
  InputGroup: ComboBoxInputGroup,
  Value: ComboBoxValue,
  Trigger: ComboBoxTrigger,
  Popover: ComboBoxPopover,
});

export type ComboBox<
  T extends object = object,
  M extends "single" | "multiple" = "single",
> = {
  Props: ComboBoxRootProps<T, M>;
  RootProps: ComboBoxRootProps<T, M>;
  InputGroupProps: ComboBoxInputGroupProps;
  ValueProps: ComboBoxValueProps<T>;
  TriggerProps: ComboBoxTriggerProps;
  PopoverProps: ComboBoxPopoverProps;
  /** The selection mode the instance was declared with (upstream's `M`). */
  SelectionMode: M;
};

/* -------------------------------------------------------------------------------------------------
 * Named components and their props
 * -----------------------------------------------------------------------------------------------*/
export {
  ComboBoxInputGroup,
  ComboBoxPopover,
  ComboBoxRoot,
  ComboBoxTrigger,
  ComboBoxValue,
};

export type {
  ComboBoxInputGroupProps,
  ComboBoxPopoverProps,
  ComboBoxRenderProps,
  ComboBoxRootProps,
  ComboBoxRootProps as ComboBoxProps,
  ComboBoxSelection,
  ComboBoxTriggerProps,
  ComboBoxValueProps,
};

export type { ComboBoxPopoverRenderProps } from "./combo-box-popover";
export type { ComboBoxTriggerRenderProps } from "./combo-box-trigger";
export type { ComboBoxValueRenderProps } from "./combo-box-value";
export type {
  ComboBoxMenuTrigger,
  ComboBoxSelectedItem,
  ComboBoxStateFacade,
} from "./combo-box-context";
export {
  ComboBoxContext,
  type ComboBoxContextValue,
} from "./combo-box-context";

/* -------------------------------------------------------------------------------------------------
 * Variants
 * -----------------------------------------------------------------------------------------------*/
export { comboBoxVariants } from "./combo-box.styles";

export type { ComboBoxVariants } from "./combo-box.styles";
