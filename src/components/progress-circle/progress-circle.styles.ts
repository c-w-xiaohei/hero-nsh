import type { VariantProps } from "tailwind-variants";

import { tv } from "tailwind-variants";

/**
 * ProgressCircle's variant table, mirroring `@heroui/styles` 3.2.7
 * `packages/styles/src/components/progress-circle/progress-circle.styles.ts`
 * plus the declarations of `packages/styles/components/progress-circle.css`.
 *
 * HeroUI's table has four slots (`base`, `track`, `trackCircle`, `fillCircle`)
 * and two dimensions (`color`, `size`). NSH has no BEM CSS (D18), so every
 * modifier is expanded to the declarations its block applies.
 *
 * The `color` dimension keeps all five values but deliberately produces **no
 * class**: upstream only assigns a custom property
 * (`--progress-circle-stroke`), and NSH has no channel for one. The root looks
 * the same colors up in the theme and hands them through the context, which is
 * the only correct place for a Canvas paint (R-002, R-016 … R-020). The
 * dimension must stay in the table so `color` remains a typed prop with the
 * same five values and the same default.
 */
export const progressCircleVariants = tv({
  slots: {
    // R-001: `.progress-circle` → `inline-flex items-center justify-center` on
    // the root view. The sheet notes NSH's `inline-flex` is a flex container
    // laid out as a block; the root wraps one fixed-size track, so nothing
    // observable changes.
    base: "inline-flex items-center justify-center",
    // R-004: `.progress-circle__track` → `size-7` (28 pt, the `md` default).
    // `relative` anchors the two absolutely positioned canvases; upstream's
    // svg is a box by itself and needs no positioning context.
    track: "relative size-7",
    // R-005: `.progress-circle__track-circle { stroke: … }` is a drawing call
    // on the TrackCircle canvas, not a class (`geometry.ts`). `absolute
    // inset-0` replaces the SVG's own box: the canvas covers the track.
    trackCircle: "absolute inset-0",
    // R-006: `.progress-circle__fill-circle { stroke: … }` likewise, and R-007
    // / R-008 (the 300 ms dash phase transition and its reduce-motion opt-out)
    // live in `FillCircle`'s animated value. Both canvases stack in source
    // order: track below, fill above.
    fillCircle: "absolute inset-0",
  },
  defaultVariants: {
    color: "accent",
    size: "md",
  },
  variants: {
    // No class in any branch by design; see the header and R-002 / R-016–R-020
    // in `progress-circle-root.tsx`, where the token lookup lives.
    color: {
      accent: {}, // R-017 (also the base default, R-002)
      default: {}, // R-016
      danger: {}, // R-020
      success: {}, // R-018
      warning: {}, // R-019
    },
    // The `size` dimension lands on the `track` slot, not the root: upstream
    // sizes `.progress-circle__track`, and `size` has no root class.
    size: {
      // R-013: `.progress-circle--sm .progress-circle__track` → `size-5` (20 pt).
      sm: { track: "size-5" },
      // R-014: `.progress-circle--md` has no declarations; `md` is the base
      // `size-7`. The empty branch keeps the variant value.
      md: { track: "" },
      // R-015: `.progress-circle--lg .progress-circle__track` → `size-9` (36 pt).
      lg: { track: "size-9" },
    },
  },
});

export type ProgressCircleVariants = VariantProps<typeof progressCircleVariants>;
