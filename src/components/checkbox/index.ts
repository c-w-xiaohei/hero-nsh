import { CheckboxContent, type CheckboxContentProps } from "./checkbox-content";
import { CheckboxControl, type CheckboxControlProps } from "./checkbox-control";
import { CheckboxGroupRoot, type CheckboxGroupRootProps } from "./checkbox-group-root";
import { CheckboxIndicator, type CheckboxIndicatorProps } from "./checkbox-indicator";
import { CheckboxRoot, type CheckboxRootProps } from "./checkbox-root";

/* -------------------------------------------------------------------------------------------------
 * Compound Components
 * -----------------------------------------------------------------------------------------------*/
export const Checkbox = Object.assign(CheckboxRoot, {
  Root: CheckboxRoot,
  Content: CheckboxContent,
  Control: CheckboxControl,
  Indicator: CheckboxIndicator,
});

export type Checkbox = {
  Props: CheckboxRootProps;
  RootProps: CheckboxRootProps;
  ContentProps: CheckboxContentProps;
  ControlProps: CheckboxControlProps;
  IndicatorProps: CheckboxIndicatorProps;
};

export const CheckboxGroup = Object.assign(CheckboxGroupRoot, {
  Root: CheckboxGroupRoot,
});

export type CheckboxGroup = {
  Props: CheckboxGroupRootProps;
  RootProps: CheckboxGroupRootProps;
};

/* -------------------------------------------------------------------------------------------------
 * Named Components
 * -----------------------------------------------------------------------------------------------*/
export {
  CheckboxContent,
  CheckboxControl,
  CheckboxGroupRoot,
  CheckboxIndicator,
  CheckboxRoot,
};

export type {
  CheckboxRootProps,
  CheckboxRootProps as CheckboxProps,
  CheckboxFieldRenderProps,
  /** @deprecated Use {@link CheckboxFieldRenderProps} for the root render prop, or {@link CheckboxButtonRenderProps} for the content. */
  CheckboxRenderProps,
} from "./checkbox-root";

export type { CheckboxContentProps, CheckboxButtonRenderProps } from "./checkbox-content";

export type { CheckboxControlProps } from "./checkbox-control";

export type { CheckboxIndicatorProps } from "./checkbox-indicator";

export type {
  CheckboxGroupRootProps,
  CheckboxGroupRootProps as CheckboxGroupProps,
  CheckboxGroupRenderProps,
} from "./checkbox-group-root";

/* -------------------------------------------------------------------------------------------------
 * Variants
 * -----------------------------------------------------------------------------------------------*/
export { checkboxGroupVariants, checkboxVariants } from "./checkbox.styles";

export type {
  CheckboxGroupVariant,
  CheckboxGroupVariants,
  CheckboxVariant,
  CheckboxVariants,
} from "./checkbox.styles";
