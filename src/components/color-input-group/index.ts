import { ColorInputGroupInput } from "./color-input-group-input";
import type { ColorInputGroupInputProps } from "./color-input-group-input";
import { ColorInputGroupPrefix } from "./color-input-group-prefix";
import type { ColorInputGroupPrefixProps } from "./color-input-group-prefix";
import { ColorInputGroupRoot } from "./color-input-group-root";
import type { ColorInputGroupRootProps } from "./color-input-group-root";
import { ColorInputGroupSuffix } from "./color-input-group-suffix";
import type { ColorInputGroupSuffixProps } from "./color-input-group-suffix";

/* -------------------------------------------------------------------------------------------------
 * Compound Component
 * -----------------------------------------------------------------------------------------------*/
/**
 * `ColorInputGroup` is HeroUI 3.2.7's internal input-group module: a root with
 * `Input`, `Prefix` and `Suffix` parts, exported upstream only through
 * `ColorField.Group` / `.Input` / `.Prefix` / `.Suffix`.
 *
 * The pipeline adds the public export anyway (port sheet §1.1, §8): it is the
 * one additive difference, it changes no existing API, and `ColorField` keeps
 * importing the named parts by this directory's internal path either way.
 */
export const ColorInputGroup = Object.assign(ColorInputGroupRoot, {
  Root: ColorInputGroupRoot,
  Input: ColorInputGroupInput,
  Prefix: ColorInputGroupPrefix,
  Suffix: ColorInputGroupSuffix,
});

export type ColorInputGroup = {
  Props: ColorInputGroupRootProps;
  RootProps: ColorInputGroupRootProps;
  InputProps: ColorInputGroupInputProps;
  PrefixProps: ColorInputGroupPrefixProps;
  SuffixProps: ColorInputGroupSuffixProps;
};

/* -------------------------------------------------------------------------------------------------
 * Named Component
 * -----------------------------------------------------------------------------------------------*/
export { ColorInputGroupInput, ColorInputGroupPrefix, ColorInputGroupRoot, ColorInputGroupSuffix };

export type {
  ColorInputGroupRootProps,
  ColorInputGroupRootProps as ColorInputGroupProps,
} from "./color-input-group-root";
export type { ColorInputGroupInputProps } from "./color-input-group-input";
export type { ColorInputGroupPrefixProps } from "./color-input-group-prefix";
export type { ColorInputGroupSuffixProps } from "./color-input-group-suffix";

/* -------------------------------------------------------------------------------------------------
 * Variants
 * -----------------------------------------------------------------------------------------------*/
export { colorInputGroupVariants } from "./color-input-group.styles";

export type { ColorInputGroupVariants } from "./color-input-group.styles";
