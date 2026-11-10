import { ColorSwatchPickerIndicator } from "./color-swatch-picker-indicator";
import type { ColorSwatchPickerIndicatorProps } from "./color-swatch-picker-indicator";
import { ColorSwatchPickerItem } from "./color-swatch-picker-item";
import type { ColorSwatchPickerItemProps } from "./color-swatch-picker-item";
import { ColorSwatchPickerRoot } from "./color-swatch-picker-root";
import type { ColorSwatchPickerRootProps } from "./color-swatch-picker-root";
import { ColorSwatchPickerSwatch } from "./color-swatch-picker-swatch";
import type { ColorSwatchPickerSwatchProps } from "./color-swatch-picker-swatch";

/* -------------------------------------------------------------------------------------------------
 * Compound Component
 * -----------------------------------------------------------------------------------------------*/
/**
 * `ColorSwatchPicker` is HeroUI 3.2.7's
 * `Object.assign(ColorSwatchPickerRoot, { Root, Item, Swatch, Indicator })`.
 * Every part is a real component, usable as `ColorSwatchPicker.Part` and as
 * `ColorSwatchPickerPart`.
 */
export const ColorSwatchPicker = Object.assign(ColorSwatchPickerRoot, {
  Root: ColorSwatchPickerRoot,
  Item: ColorSwatchPickerItem,
  Swatch: ColorSwatchPickerSwatch,
  Indicator: ColorSwatchPickerIndicator,
});

export type ColorSwatchPicker = {
  Props: ColorSwatchPickerRootProps;
  RootProps: ColorSwatchPickerRootProps;
  ItemProps: ColorSwatchPickerItemProps;
  SwatchProps: ColorSwatchPickerSwatchProps;
  IndicatorProps: ColorSwatchPickerIndicatorProps;
};

/* -------------------------------------------------------------------------------------------------
 * Named Components
 * -----------------------------------------------------------------------------------------------*/
export {
  ColorSwatchPickerIndicator,
  ColorSwatchPickerItem,
  ColorSwatchPickerRoot,
  ColorSwatchPickerSwatch,
};

export type {
  ColorSwatchPickerIndicatorProps,
  ColorSwatchPickerItemProps,
  ColorSwatchPickerRootProps,
  ColorSwatchPickerRootProps as ColorSwatchPickerProps,
  ColorSwatchPickerSwatchProps,
};

/* -------------------------------------------------------------------------------------------------
 * Render props (accessor objects, D17)
 * -----------------------------------------------------------------------------------------------*/
export type {
  ColorSwatchPickerItemChildren,
  ColorSwatchPickerItemRenderProps,
} from "./color-swatch-picker-item";
export type { ColorSwatchPickerRenderProps } from "./color-swatch-picker-root";
export type {
  ColorSwatchPickerSwatchChildren,
  ColorSwatchPickerSwatchRenderProps,
} from "./color-swatch-picker-swatch";
export type { ColorSwatchPickerIndicatorChildren } from "./color-swatch-picker-indicator";

/* -------------------------------------------------------------------------------------------------
 * Variants
 * -----------------------------------------------------------------------------------------------*/
export { colorSwatchPickerVariants } from "./color-swatch-picker.styles";

export type { ColorSwatchPickerVariants } from "./color-swatch-picker.styles";
