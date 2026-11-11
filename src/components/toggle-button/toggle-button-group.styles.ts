import type { VariantProps } from "tailwind-variants/lite";

import { tv } from "tailwind-variants/lite";

import { ease } from "../../tokens/geometry";

/*
 * ToggleButtonGroup variant table (HeroUI 3.2.7,
 * packages/styles/components/toggle-button-group.css). HeroUI's table only
 * names BEM classes; the declarations live in the stylesheet, so every rule
 * below is the NSH translation of one of them.
 */
export const toggleButtonGroupVariants = tv({
  slots: {
    // R-027: `.toggle-button-group` base box. `w-fit` writes out the
    // shrink-to-content width of an inline-flex box on the web.
    // The group rounds and clips its own box, so the members can stay square
    // and still show one joined shape. `first:` / `last:` cannot do that here:
    // each button is its own parent, so both match everywhere.
    base: "inline-flex h-auto w-fit items-center justify-center gap-0 rounded-3xl overflow-clip",
    // R-041, R-043. R-042 (`bg-current`) becomes a colorless border in the
    // orientation rules below: a border without a color is drawn in the
    // element's text color, which is what currentColor asked for.
    separator:
      `absolute rounded-sm opacity-15 pointer-events-none transition-opacity duration-150 ${ease.smooth} motion-reduce:transition-none`,
  },
  variants: {
    // R-030, after `w-fit` in the class string.
    fullWidth: {
      false: {},
      true: { base: "w-full" },
    },
    // R-046, R-048: detached mode opens the gap and hides the separators.
    isDetached: {
      false: {},
      true: { base: "gap-1 rounded-none overflow-visible", separator: "hidden" },
    },
    // R-028, R-029 (NSH views default to a column, so the direction is
    // explicit); R-044, R-045 for the separator's geometry.
    orientation: {
      horizontal: {
        base: "flex-row",
        separator: "-start-px top-1/4 w-px h-1/2 border-s",
      },
      vertical: {
        base: "flex-col",
        separator: "start-1/4 -top-px w-1/2 h-px border-t",
      },
    },
  },
  defaultVariants: {
    fullWidth: false,
    isDetached: false,
    orientation: "horizontal",
  },
});

export type ToggleButtonGroupVariants = VariantProps<typeof toggleButtonGroupVariants>;

export type ToggleButtonGroupOrientation = NonNullable<
  ToggleButtonGroupVariants["orientation"]
>;
