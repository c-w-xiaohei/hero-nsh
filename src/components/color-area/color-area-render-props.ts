/*
 * The render props of HeroUI 3.2.7's ColorArea parts, as React Aria
 * Components' `ColorAreaRenderProps` / `ColorThumbRenderProps` shape them.
 *
 * D17: every value is an accessor, so reading one inside a render function is
 * what subscribes the class string, the style or the subtree to it. The shape
 * is registered as an intentional difference in port sheet §8.
 */

import type { Accessor, JSX } from "nsh";

import type { Color } from "./colors";
import type { ColorAreaState } from "./create-color-area-state";

/** What `ColorArea.Root` passes to its render props: RAC's `ColorAreaRenderProps`. */
export interface ColorAreaRenderProps {
  /** The whole state, its own values accessors (D17). */
  state: ColorAreaState;

  /** Whether every interaction is blocked. */
  isDisabled: Accessor<boolean>;
}

/**
 * What `ColorArea.Thumb` passes to its render props: RAC's
 * `ColorThumbRenderProps`.
 */
export interface ColorThumbRenderProps {
  /**
   * The color the thumb shows: React Aria's `getDisplayColor`, the current
   * color with alpha forced to 1 (R-021).
   */
  color: Accessor<Color>;

  /** A pointer interaction is in progress (R-017). */
  isDragging: Accessor<boolean>;

  /** The pointer is over the thumb. */
  isHovered: Accessor<boolean>;

  /** The thumb has the keyboard focus. */
  isFocused: Accessor<boolean>;

  /** The focus came from the keyboard, the only case with a ring (R-016). */
  isFocusVisible: Accessor<boolean>;

  /** Whether every interaction is blocked (R-018). */
  isDisabled: Accessor<boolean>;
}

/** `children` as a node or a render prop, for both parts. */
export type ColorAreaChildren<RenderProps> =
  | JSX.Element
  | ((values: RenderProps) => JSX.Element);
