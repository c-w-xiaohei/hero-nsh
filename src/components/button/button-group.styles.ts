import type { VariantProps } from "tailwind-variants/lite";

import { tv } from "tailwind-variants/lite";

import { ease } from "../../tokens/geometry";

/*
 * ButtonGroup variant table (HeroUI 3.2.7,
 * packages/styles/components/button-group.css).
 */
export const buttonGroupVariants = tv({
  slots: {
    // R-030. w-fit writes out the shrink-to-content an inline-flex box has on
    // the web; NSH has no inline layout context.
    base: "inline-flex h-auto w-fit items-center justify-center gap-0",
    // R-042, R-044. R-043 (bg-current) becomes a colorless border in each
    // orientation rule below: a border without a color is drawn in the
    // element's text color, which is what currentColor asked for.
    separator:
      `absolute rounded-sm opacity-15 pointer-events-none transition-opacity duration-150 ${ease.smooth} motion-reduce:transition-none`,
  },
  variants: {
    fullWidth: {
      // R-053
      false: {},
      true: { base: "w-full" },
    },
    orientation: {
      // R-031, R-045
      horizontal: {
        base: "flex-row",
        separator: "-start-px top-1/4 w-px h-1/2 border-s",
      },
      // R-032, R-046
      // `flex-col` brings the column's own cross-axis default, which drops the
      // base slot's `items-center`; the group keeps the width of its widest
      // button upstream, so both are restated here.
      vertical: {
        // Stretch, not centre: a column of buttons that size to their own labels
        // leaves each row a different width, and the clipped outer corners then
        // read as notches. Stretched, every row takes the widest one.
        base: "flex-col items-stretch w-fit self-start",
        separator: "start-1/4 -top-px w-1/2 h-px border-t",
      },
    },
  },
  defaultVariants: {
    fullWidth: false,
    orientation: "horizontal",
  },
});

export type ButtonGroupVariants = VariantProps<typeof buttonGroupVariants>;

export type ButtonGroupOrientation = NonNullable<ButtonGroupVariants["orientation"]>;
