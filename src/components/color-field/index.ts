import {
  ColorInputGroupInput,
  ColorInputGroupPrefix,
  ColorInputGroupRoot,
  ColorInputGroupSuffix,
} from "../color-input-group";
import type {
  ColorInputGroupInputProps,
  ColorInputGroupPrefixProps,
  ColorInputGroupRootProps,
  ColorInputGroupSuffixProps,
} from "../color-input-group";

import { ColorFieldRoot } from "./color-field-root";
import type { ColorFieldRootProps } from "./color-field-root";

/* -------------------------------------------------------------------------------------------------
 * Compound Component
 * -----------------------------------------------------------------------------------------------*/
/**
 * `ColorField` is HeroUI 3.2.7's field for a hex color or one of its channels:
 * a root that owns the value state, plus the four `ColorInputGroup` parts it
 * exposes as `Group`, `Input`, `Prefix` and `Suffix`. Every part is a real
 * component, usable as `ColorField.Part` and as `ColorFieldPart`, exactly as
 * upstream exports them.
 */
export const ColorField = Object.assign(ColorFieldRoot, {
  Root: ColorFieldRoot,
  Group: ColorInputGroupRoot,
  Input: ColorInputGroupInput,
  Prefix: ColorInputGroupPrefix,
  Suffix: ColorInputGroupSuffix,
});

export type ColorField = {
  Props: ColorFieldRootProps;
  RootProps: ColorFieldRootProps;
  GroupProps: ColorInputGroupRootProps;
  InputProps: ColorInputGroupInputProps;
  PrefixProps: ColorInputGroupPrefixProps;
  SuffixProps: ColorInputGroupSuffixProps;
};

/* -------------------------------------------------------------------------------------------------
 * Named Component
 * -----------------------------------------------------------------------------------------------*/
export { ColorFieldRoot };

export type {
  ColorFieldRootProps,
  ColorFieldRootProps as ColorFieldProps,
  ColorValue,
} from "./color-field-root";

/* -------------------------------------------------------------------------------------------------
 * Render props (accessor objects, D17)
 * -----------------------------------------------------------------------------------------------*/
export type { ColorFieldRenderProps } from "./color-field-root";
export type {
  ColorFieldState,
  ColorFieldValidationResult,
} from "./create-color-field-state";

/* -------------------------------------------------------------------------------------------------
 * Variants
 * -----------------------------------------------------------------------------------------------*/
export { colorFieldVariants } from "./color-field.styles";

export type { ColorFieldVariants } from "./color-field.styles";
