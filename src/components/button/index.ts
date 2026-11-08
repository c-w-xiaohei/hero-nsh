import { ButtonRoot, type ButtonRenderProps, type ButtonRootProps } from "./button-root";
import { ButtonGroupSeparator, type ButtonGroupSeparatorProps } from "./button-group-separator";
import {
  ButtonGroupRoot,
  type ButtonGroupRenderProps,
  type ButtonGroupRootProps,
} from "./button-group-root";

/* ------------------------------------------------------------------------------------------------
 * Compound components
 * ---------------------------------------------------------------------------------------------- */
export const Button = Object.assign(ButtonRoot, {
  Root: ButtonRoot,
});

export type Button = {
  Props: ButtonRootProps;
  RootProps: ButtonRootProps;
};

export const ButtonGroup = Object.assign(ButtonGroupRoot, {
  Root: ButtonGroupRoot,
  Separator: ButtonGroupSeparator,
});

export type ButtonGroup = {
  Props: ButtonGroupRootProps;
  RootProps: ButtonGroupRootProps;
  SeparatorProps: ButtonGroupSeparatorProps;
};

/* ------------------------------------------------------------------------------------------------
 * Named components and their props
 * ---------------------------------------------------------------------------------------------- */
export { ButtonRoot, ButtonGroupRoot, ButtonGroupSeparator };

export type {
  ButtonRenderProps,
  ButtonRootProps,
  ButtonRootProps as ButtonProps,
  ButtonGroupRenderProps,
  ButtonGroupRootProps,
  ButtonGroupRootProps as ButtonGroupProps,
  ButtonGroupSeparatorProps,
};

/* ------------------------------------------------------------------------------------------------
 * Context and the group marker, as HeroUI exports them
 * ---------------------------------------------------------------------------------------------- */
export {
  ButtonGroupContext,
  BUTTON_GROUP_CHILD,
  type ButtonGroupContextValue,
  type ButtonGroupItem,
} from "./button-group-context";

/* ------------------------------------------------------------------------------------------------
 * Variants
 * ---------------------------------------------------------------------------------------------- */
export { buttonVariants, type ButtonVariant, type ButtonSize } from "./button.styles";

export type { ButtonVariants } from "./button.styles";

export {
  buttonGroupVariants,
  type ButtonGroupOrientation,
} from "./button-group.styles";

export type { ButtonGroupVariants } from "./button-group.styles";
