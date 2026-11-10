import type { Accessor } from "nsh";
import { context } from "nsh";

import type { Color } from "../color-swatch";
import type { colorPickerVariants } from "./color-picker.styles";

/* -------------------------------------------------------------------------------------------------
 * The color of the picker, handed to every color part inside it
 * -----------------------------------------------------------------------------------------------*/

/**
 * React Aria's `ColorPicker` provides the same `{ value, onChange }` pair to
 * six slotted contexts — `ColorSlider`, `ColorArea`, `ColorWheel`,
 * `ColorField`, `ColorSwatch` and `ColorSwatchPicker`
 * (`react-aria-components/src/ColorPicker.tsx`). This is that pair in NSH
 * form: one context every color part reads, so a part inside a `ColorPicker`
 * follows the picker's color instead of a prop of its own.
 *
 * Port sheet §5, change 1: the consumers (`ColorSwatchPicker` in this unit,
 * plus `ColorSwatch`, `ColorArea`, `ColorSlider` and `ColorField`) read it
 * **only when their own `value` / `color` prop is missing**, and call
 * `onChange` after their own change callback. Outside a `ColorPicker` the
 * context is `undefined` and every consumer behaves exactly as before.
 */
export interface ColorPickerColorContextValue {
  /** The picker's current color; `undefined` while the picker has none. */
  value: Accessor<Color | undefined>;

  /** Reports a new color to the picker, which owns the single source of truth. */
  onChange: (color: Color) => void;
}

export const ColorPickerColorContext = context<
  ColorPickerColorContextValue | undefined
>(undefined);

/* -------------------------------------------------------------------------------------------------
 * The slots of the picker's own parts
 * -----------------------------------------------------------------------------------------------*/

/** The slots `colorPickerVariants` produces, as the parts call them. */
export type ColorPickerSlots = ReturnType<typeof colorPickerVariants>;

/**
 * HeroUI's `ColorPickerContext` (`{ slots }`), which Root provides so Trigger
 * and Popover can append their own slot classes without the caller wiring
 * anything. Not the color: that one is `ColorPickerColorContext` above, and it
 * reaches the color parts, not these three.
 */
export interface ColorPickerContextValue {
  slots: ColorPickerSlots;
}

export const ColorPickerContext = context<ColorPickerContextValue | undefined>(
  undefined,
);
