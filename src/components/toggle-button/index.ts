import {
  ToggleButtonRoot,
  type ToggleButtonRenderProps,
  type ToggleButtonRootProps,
} from "./toggle-button-root";
import {
  ToggleButtonGroupRoot,
  type ToggleButtonGroupRenderProps,
  type ToggleButtonGroupRootProps,
} from "./toggle-button-group-root";
import {
  ToggleButtonGroupSeparator,
  type ToggleButtonGroupSeparatorProps,
} from "./toggle-button-group-separator";

/* -------------------------------------------------------------------------------------------------
 * Compound Component
 * -----------------------------------------------------------------------------------------------*/
export const ToggleButton = Object.assign(ToggleButtonRoot, {
  Root: ToggleButtonRoot,
});

export type ToggleButton = {
  Props: ToggleButtonRootProps;
  RootProps: ToggleButtonRootProps;
};

export const ToggleButtonGroup = Object.assign(ToggleButtonGroupRoot, {
  Root: ToggleButtonGroupRoot,
  Separator: ToggleButtonGroupSeparator,
});

export type ToggleButtonGroup = {
  Props: ToggleButtonGroupRootProps;
  RootProps: ToggleButtonGroupRootProps;
  SeparatorProps: ToggleButtonGroupSeparatorProps;
};

/* -------------------------------------------------------------------------------------------------
 * Named Component
 * -----------------------------------------------------------------------------------------------*/
export { ToggleButtonRoot, ToggleButtonGroupRoot, ToggleButtonGroupSeparator };

export type {
  ToggleButtonRenderProps,
  ToggleButtonRootProps,
  ToggleButtonRootProps as ToggleButtonProps,
  ToggleButtonGroupRenderProps,
  ToggleButtonGroupRootProps,
  ToggleButtonGroupRootProps as ToggleButtonGroupProps,
  ToggleButtonGroupSeparatorProps,
};

/* -------------------------------------------------------------------------------------------------
 * Context
 * -----------------------------------------------------------------------------------------------*/
export {
  ToggleButtonGroupContext,
  TOGGLE_BUTTON_GROUP_CHILD,
  type ToggleButtonGroupContextValue,
  type ToggleButtonGroupItem,
  type ToggleButtonGroupSelectionMode,
} from "./toggle-button-group-context";

/* -------------------------------------------------------------------------------------------------
 * Variants
 * -----------------------------------------------------------------------------------------------*/
export {
  toggleButtonVariants,
  type ToggleButtonSize,
  type ToggleButtonVariant,
} from "./toggle-button.styles";

export type { ToggleButtonVariants } from "./toggle-button.styles";

export {
  toggleButtonGroupVariants,
  type ToggleButtonGroupOrientation,
} from "./toggle-button-group.styles";

export type { ToggleButtonGroupVariants } from "./toggle-button-group.styles";
