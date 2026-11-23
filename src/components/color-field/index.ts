// A-003 / A-004: these two 接轴 spots of adapt sheet color-field.md are B(继承)
// rows — the seam is realized inside `src/components/color-input-group/`
// (the `input` axis of `colorInputGroupVariants` carries touch `min-h-11`, and
// `createInput()` gates `hovered`/`onHover*` under touch). `ColorField.Group`
// and `ColorField.Input` bind the very same components in the Object.assign
// below, so they inherit the behavior by identity; this directory adds zero
// style axes and reads no environment. The gate's marker scan only sees this
// directory, so the record lives here.
// A-010: the harness-side 接轴 spot is realized outside this directory —
// `harness/color-field.fixtures.tsx` (`Scoped` feeds `host.params.scope="touch"`
// into `EnvironmentScope` around every case and mounts the `layout`/`submit`/
// `kbd`/`hover` probes). Same marker-scan convention as above.
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
