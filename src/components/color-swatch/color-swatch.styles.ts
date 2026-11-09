import type { VariantProps } from "tailwind-variants";

import { tv } from "tailwind-variants";

/**
 * ColorSwatch's variant table, mirroring `@heroui/styles` 3.2.7
 * `packages/styles/src/components/color-swatch/color-swatch.styles.ts` plus the
 * declarations of `packages/styles/components/color-swatch.css`.
 *
 * Upstream's table only names BEM blocks (`color-swatch`,
 * `color-swatch--<shape|size>`) and the declarations live in the stylesheet, so
 * the base and variant entries below carry those declarations (D18: no BEM
 * classes in NSH). The order is upstream's cascade: base, then `shape`, then
 * `size`, then the size × shape compounds, so a compound radius wins over the
 * shape's default exactly where `.color-swatch--xs.color-swatch--circle` wins
 * over `.color-swatch--circle`.
 *
 * The background pattern and the border are structural views, not classes: the
 * checkerboard needs a fixed 16-point tile that NSH cannot express as one
 * repeating background (port sheet §4, R-002 / R-003 / R-004, written out in
 * `color-swatch-root.tsx`).
 */
export const colorSwatchVariants = tv({
  base: [
    // R-001: `.color-swatch` → `relative box-border size-8 shrink-0`.
    // `size-8` is the md default (32 points); `box-border` does not change the
    // resolved style in NSH (twref's "changes nothing" list); `shrink-0` is the
    // same value as NSH's default `flexShrink: 0` and is kept for the line-by-
    // line correspondence with upstream.
    "relative box-border size-8 shrink-0",
    // R-002 (structure): the root clips the 48-point checkerboard to the
    // rounded box, exactly where the CSS background's own box stopped.
    "overflow-hidden",
  ].join(" "),
  variants: {
    /*
     * R-005: `.color-swatch--circle` → `rounded-2xl` (16 points).
     * R-006: `.color-swatch--square` → `rounded-md` (6 points); `square` does
     * not follow `size`, so no compound below mentions it.
     */
    shape: {
      circle: "rounded-2xl",
      square: "rounded-md",
    },
    /*
     * R-007: `.color-swatch--xs` → `size-4` (16 points).
     * R-009: `.color-swatch--sm` → `size-6` (24 points).
     * R-011 is empty: `.color-swatch--md` declares nothing (32 points is the
     * base `size-8`); the variant entry stays so the surface matches HeroUI's.
     * R-012: `.color-swatch--lg` → `size-9` (36 points).
     * R-014: `.color-swatch--xl` → `size-10` (40 points).
     */
    size: {
      lg: "size-9",
      md: "",
      sm: "size-6",
      xl: "size-10",
      xs: "size-4",
    },
  },
  compoundVariants: [
    // R-008: `.color-swatch--xs.color-swatch--circle` → `rounded-lg` (8 points).
    { shape: "circle", size: "xs", class: "rounded-lg" },
    // R-010: `.color-swatch--sm.color-swatch--circle` → `rounded-xl` (12 points).
    { shape: "circle", size: "sm", class: "rounded-xl" },
    // R-013: `.color-swatch--lg.color-swatch--circle` → `rounded-3xl` (24 points).
    { shape: "circle", size: "lg", class: "rounded-3xl" },
    // R-015: `.color-swatch--xl.color-swatch--circle` → `rounded-3xl` (24 points).
    { shape: "circle", size: "xl", class: "rounded-3xl" },
  ],
  defaultVariants: {
    shape: "circle",
    size: "md",
  },
});

export type ColorSwatchVariants = VariantProps<typeof colorSwatchVariants>;
