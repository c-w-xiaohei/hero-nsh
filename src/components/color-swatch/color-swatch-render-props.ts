import type { JSX } from "nsh";

import type { Color } from "./colors";

/**
 * The argument of HeroUI's three render props on `ColorSwatch`
 * (`className`, `style`, `children`): RAC's `ColorSwatchRenderProps`.
 *
 * D17 (Solid convention): the values are accessors, so reading one inside the
 * function is what subscribes the class string, the style or the subtree to the
 * color. The shape is the one registered as a difference in port sheet §8.
 */
export interface ColorSwatchRenderProps {
  /** The resolved color of the swatch. */
  color: () => Color;
}

/** The render props a node gets when it is not a function, so both forms share one type. */
export type ColorSwatchChildren =
  | JSX.Element
  | ((renderProps: ColorSwatchRenderProps) => JSX.Element);
