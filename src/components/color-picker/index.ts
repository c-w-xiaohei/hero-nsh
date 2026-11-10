import { ColorPickerPopover } from "./color-picker-popover";
import type { ColorPickerPopoverProps } from "./color-picker-popover";
import { ColorPickerRoot } from "./color-picker-root";
import type { ColorPickerRootProps } from "./color-picker-root";
import { ColorPickerTrigger } from "./color-picker-trigger";
import type { ColorPickerTriggerProps } from "./color-picker-trigger";

/* -------------------------------------------------------------------------------------------------
 * Compound Component
 * -----------------------------------------------------------------------------------------------*/
/**
 * `ColorPicker` is HeroUI 3.2.7's `Object.assign(ColorPickerRoot, { Root,
 * Trigger, Popover })`. Every part is a real component, usable as
 * `ColorPicker.Part` and as `ColorPickerPart`.
 */
export const ColorPicker = Object.assign(ColorPickerRoot, {
  Root: ColorPickerRoot,
  Trigger: ColorPickerTrigger,
  Popover: ColorPickerPopover,
});

export type ColorPicker = {
  Props: ColorPickerRootProps;
  RootProps: ColorPickerRootProps;
  TriggerProps: ColorPickerTriggerProps;
  PopoverProps: ColorPickerPopoverProps;
};

/* -------------------------------------------------------------------------------------------------
 * Named Components
 * -----------------------------------------------------------------------------------------------*/
export { ColorPickerPopover, ColorPickerRoot, ColorPickerTrigger };

export type {
  ColorPickerPopoverProps,
  ColorPickerRootProps,
  ColorPickerRootProps as ColorPickerProps,
  ColorPickerTriggerProps,
};

/* -------------------------------------------------------------------------------------------------
 * Variants
 * -----------------------------------------------------------------------------------------------*/
export { colorPickerVariants } from "./color-picker.styles";

export type { ColorPickerVariants } from "./color-picker.styles";
