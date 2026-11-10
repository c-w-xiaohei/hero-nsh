import { ColorSwatchRoot } from "./color-swatch-root";
import type { ColorSwatchRootProps } from "./color-swatch-root";

/* -------------------------------------------------------------------------------------------------
 * Compound Component
 * -----------------------------------------------------------------------------------------------*/
/**
 * `ColorSwatch` is the same single part as `ColorSwatchRoot`, with `.Root`
 * pointing at itself, exactly as HeroUI 3.2.7's `Object.assign(ColorSwatchRoot,
 * { Root: ColorSwatchRoot })`. A single part is still a real component.
 */
export const ColorSwatch = Object.assign(ColorSwatchRoot, {
  Root: ColorSwatchRoot,
});

export type ColorSwatch = {
  Props: ColorSwatchRootProps;
  RootProps: ColorSwatchRootProps;
};

/* -------------------------------------------------------------------------------------------------
 * Named Component
 * -----------------------------------------------------------------------------------------------*/
export { ColorSwatchRoot };

export type { ColorSwatchRootProps, ColorSwatchRootProps as ColorSwatchProps };

/* -------------------------------------------------------------------------------------------------
 * Render props
 * -----------------------------------------------------------------------------------------------*/
export type { ColorSwatchRenderProps } from "./color-swatch-render-props";

/* -------------------------------------------------------------------------------------------------
 * Variants
 * -----------------------------------------------------------------------------------------------*/
export { colorSwatchVariants } from "./color-swatch.styles";

export type { ColorSwatchVariants } from "./color-swatch.styles";

/* -------------------------------------------------------------------------------------------------
 * Color value model
 * -----------------------------------------------------------------------------------------------*/
/*
 * Additive export (port sheet §1 and §5): `color` accepts a `Color` as well as
 * a string, so callers need `parseColor` to build one. The model is a port of
 * Kobalte's `colors/` directory; when the controller lifts it into
 * `src/primitives/colors` between batches, this directory imports it from there
 * instead.
 */
export { normalizeColor, parseColor } from "./colors";

export type {
  Color,
  ColorAxes,
  ColorChannel,
  ColorChannelRange,
  ColorFormat,
  ColorIntlTranslations,
  ColorSpace,
} from "./colors";
