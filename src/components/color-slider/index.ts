import { ColorSliderOutput } from "./color-slider-output";
import type { ColorSliderOutputProps } from "./color-slider-output";
import { ColorSliderRoot } from "./color-slider-root";
import type { ColorSliderRootProps } from "./color-slider-root";
import { ColorSliderThumb } from "./color-slider-thumb";
import type { ColorSliderThumbProps } from "./color-slider-thumb";
import { ColorSliderTrack } from "./color-slider-track";
import type { ColorSliderTrackProps } from "./color-slider-track";

/* -------------------------------------------------------------------------------------------------
 * Compound Component
 * -----------------------------------------------------------------------------------------------*/
/**
 * `ColorSlider` is HeroUI 3.2.7's four-part compound:
 * `Object.assign(ColorSliderRoot, { Root, Output, Track, Thumb })`. There is
 * deliberately no `ColorSlider.Label`: the label is the independent `Label`
 * component, which reports its text through `FieldContext`.
 */
export const ColorSlider = Object.assign(ColorSliderRoot, {
  Root: ColorSliderRoot,
  Output: ColorSliderOutput,
  Track: ColorSliderTrack,
  Thumb: ColorSliderThumb,
});

export type ColorSlider = {
  Props: ColorSliderRootProps;
  RootProps: ColorSliderRootProps;
  OutputProps: ColorSliderOutputProps;
  TrackProps: ColorSliderTrackProps;
  ThumbProps: ColorSliderThumbProps;
};

/* -------------------------------------------------------------------------------------------------
 * Named Components
 * -----------------------------------------------------------------------------------------------*/
export { ColorSliderOutput, ColorSliderRoot, ColorSliderThumb, ColorSliderTrack };

export type {
  ColorSliderRootProps,
  ColorSliderRootProps as ColorSliderProps,
} from "./color-slider-root";

export type { ColorSliderOutputProps } from "./color-slider-output";

export type { ColorSliderTrackProps } from "./color-slider-track";

export type { ColorSliderThumbProps } from "./color-slider-thumb";

/* -------------------------------------------------------------------------------------------------
 * Channel types (the `channel` / `colorSpace` discriminated union)
 * -----------------------------------------------------------------------------------------------*/
export type {
  AlphaChannel,
  ColorSliderChannelProps,
  HSLChannel,
  HSLHSBSharedChannel,
  HSBChannel,
  RGBChannel,
} from "./color-slider-root";

/* -------------------------------------------------------------------------------------------------
 * Render props (additive: HeroUI reaches these through `ComponentProps`)
 * -----------------------------------------------------------------------------------------------*/
export type {
  ColorSliderOrientation,
  ColorSliderRenderProps,
  ColorSliderThumbRenderProps,
  ColorSliderTrackRenderProps,
} from "./color-slider-context";

/* -------------------------------------------------------------------------------------------------
 * Variants
 * -----------------------------------------------------------------------------------------------*/
export { colorSliderVariants } from "./color-slider.styles";

export type { ColorSliderVariants } from "./color-slider.styles";
