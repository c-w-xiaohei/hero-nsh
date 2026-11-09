import { NumberFieldGroup } from "./number-field-group";
import type { NumberFieldGroupProps } from "./number-field-group";
import { NumberFieldInput } from "./number-field-input";
import type { NumberFieldInputProps } from "./number-field-input";
import { NumberFieldRoot } from "./number-field-root";
import type { NumberFieldRootProps } from "./number-field-root";
import {
  NumberFieldDecrementButton,
  NumberFieldIncrementButton,
} from "./number-field-step-button";
import type { NumberFieldStepButtonProps } from "./number-field-step-button";

/* -------------------------------------------------------------------------------------------------
 * Compound Component
 * -----------------------------------------------------------------------------------------------*/
/**
 * `NumberField` is HeroUI 3.2.7's five-part number input: a root that owns the
 * value and the field state, a group grid, one editable input and the two step
 * buttons. Every part is a real component, usable as `NumberField.Group` and as
 * `NumberFieldGroup`, exactly as upstream exports them.
 */
export const NumberField = Object.assign(NumberFieldRoot, {
  Root: NumberFieldRoot,
  Group: NumberFieldGroup,
  Input: NumberFieldInput,
  IncrementButton: NumberFieldIncrementButton,
  DecrementButton: NumberFieldDecrementButton,
});

export type NumberField = {
  Props: NumberFieldRootProps;
  RootProps: NumberFieldRootProps;
  GroupProps: NumberFieldGroupProps;
  InputProps: NumberFieldInputProps;
  IncrementButtonProps: NumberFieldStepButtonProps;
  DecrementButtonProps: NumberFieldStepButtonProps;
};

/* -------------------------------------------------------------------------------------------------
 * Named Component
 * -----------------------------------------------------------------------------------------------*/
export {
  NumberFieldDecrementButton,
  NumberFieldGroup,
  NumberFieldIncrementButton,
  NumberFieldInput,
  NumberFieldRoot,
};

export type {
  NumberFieldRootProps,
  NumberFieldRootProps as NumberFieldProps,
} from "./number-field-root";
export type { NumberFieldGroupProps } from "./number-field-group";
export type { NumberFieldInputProps } from "./number-field-input";
export type {
  NumberFieldIncrementButtonProps,
  NumberFieldDecrementButtonProps,
} from "./number-field-step-button";

/* -------------------------------------------------------------------------------------------------
 * Render props (accessor objects, D17)
 * -----------------------------------------------------------------------------------------------*/
export type { NumberFieldRenderProps } from "./number-field-root";
export type { NumberFieldGroupRenderProps } from "./number-field-group";
export type { NumberFieldInputRenderProps } from "./number-field-input";
export type { NumberFieldStepButtonRenderProps } from "./number-field-step-button";
export type { NumberFieldState } from "./create-number-field-state";

/* -------------------------------------------------------------------------------------------------
 * Variants
 * -----------------------------------------------------------------------------------------------*/
export { numberFieldVariants } from "./number-field.styles";

export type { NumberFieldVariants } from "./number-field.styles";
