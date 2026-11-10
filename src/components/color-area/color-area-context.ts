/*
 * Kobalte's `packages/core/src/color-area/color-area-context.ts`, narrowed to
 * what HeroUI's two parts need.
 *
 * The root owns the color, the axes, the direction, the disabled flag, the
 * pointer drag and the thumb's focus state; the Thumb reads all of it from here
 * instead of from `data-*` attributes (D18) or descendant selectors. The thumb's
 * node also travels back: a drag that starts on the panel ends by focusing the
 * Thumb, as React Aria does.
 *
 * This context is internal, exactly as HeroUI's own `ColorAreaContext` is; it is
 * not exported from the public entry.
 */

import type { Accessor, ViewRef } from "nsh";
import { context } from "nsh";

import type { InteractionModalityState } from "../../primitives";
import type { Color } from "./colors";
import type { ColorAreaIntlTranslations } from "./color-area.intl";
import type { colorAreaVariants } from "./color-area.styles";
import type { ColorAreaState } from "./create-color-area-state";

/** The slot functions of the variant table, for the resolved variant. */
export type ColorAreaSlots = ReturnType<typeof colorAreaVariants>;

/** What the Root hands every part (port sheet §2). */
export interface ColorAreaContextValue {
  /** The color, the axes, the ranges and the drag flag. */
  state: ColorAreaState;

  /** The variant table's slot functions for the resolved variant. */
  slots: Accessor<ColorAreaSlots>;

  /** `props.isDisabled ?? false`, so both parts dim together. */
  isDisabled: Accessor<boolean>;

  /** The reading direction, from the locale (R-019, and the Left/Right keys). */
  direction: Accessor<"ltr" | "rtl">;

  /** The English strings; NSH has no translation provider. */
  translations: ColorAreaIntlTranslations;

  /** The caller's `aria-label`, the base of the group's and the thumb's names. */
  ariaLabel: Accessor<string | undefined>;

  /** The current color with alpha forced to 1: the thumb's own color (R-021). */
  displayColor: Accessor<Color>;

  /** The interaction modality, which decides whether the focus ring shows. */
  modality: InteractionModalityState;

  /** Whether the Thumb has the keyboard focus (the root also needs it). */
  isFocused: Accessor<boolean>;
  setFocused: (focused: boolean) => void;

  /** The Thumb registers its node so a panel drag can focus it on release. */
  setThumbRef: (node: ViewRef | undefined) => void;

  /** A press on the Thumb: keep the value, focus it and start the drag. */
  beginThumbDrag: () => void;

  /** A Thumb drag moved by `dx` / `dy` points since it began. */
  moveThumbDrag: (dx: number, dy: number) => void;

  /** The pointer interaction ended (release or terminate). */
  endThumbDrag: () => void;

  /**
   * Whether the focus event that just arrived came from a programmatic
   * `focus()` after a pointer press, which must not show the ring. Clears the
   * flag as it answers.
   */
  consumePointerFocus: () => boolean;
}

export const ColorAreaContext = context<ColorAreaContextValue | undefined>(
  undefined,
);

/**
 * The context of the nearest `ColorArea`. A Thumb outside one is a caller
 * mistake, and Kobalte's message (adapted) says which component is missing.
 */
export function useColorAreaContext(): ColorAreaContextValue {
  const value = ColorAreaContext();

  if (value === undefined) {
    throw new Error(
      "[hero-nsh]: `ColorArea.Thumb` must be used within a `ColorArea`",
    );
  }

  return value;
}
