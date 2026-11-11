import type { VariantProps } from "tailwind-variants";

import { tv } from "tailwind-variants";

/**
 * ProgressBar's variant table, mirroring `@heroui/styles` 3.2.7
 * `packages/styles/src/components/progress-bar/progress-bar.styles.ts` plus the
 * declarations of `packages/styles/components/progress-bar.css`.
 *
 * HeroUI's table has two dimensions (`color`, `size`) whose BEM modifiers only
 * set custom properties on the block; the CSS file's descendant selectors then
 * paint the track and fill. NSH has no BEM CSS (D18), so each modifier is
 * expanded onto the slot it actually paints: the dimensions and their values
 * are unchanged, the class strings are the declarations they stood for.
 *
 * The parts are placed with grid lines instead of the block's
 * `grid-template-areas`, which NSH has no utility for (port sheet section 4,
 * R-002 / R-005 / R-006 / R-010).
 */
export const progressBarVariants = tv({
  slots: {
    // R-001: `.progress-bar` → `@apply grid w-full gap-1`.
    // R-002 / R-005 / R-006: `grid-template-areas` has no NSH counterpart, so
    // the areas become explicit placement. `justify-items-start` gives the one
    // automatically placed item (the caller's Label) its `w-fit` width: it is
    // laid out at the content width instead of stretched, and the grid's auto
    // placement then puts it in row 1 / column 1, where `grid-area: label` was.
    // R-003: `.progress-bar` → `grid-template-columns: 1fr auto`.
    base: "grid w-full gap-1 grid-cols-[1fr_auto] justify-items-start",
    // R-007: `.progress-bar__output` → `@apply text-sm font-medium
    // tabular-nums`.
    // R-008: `.progress-bar__output` → `grid-area: output`, written as
    // row 1 / column 2.
    output: "text-sm font-medium text-foreground tabular-nums col-start-2 row-start-1",
    // R-009: `.progress-bar__track` → `@apply relative overflow-hidden
    // rounded-sm bg-default`. The clip is what makes the fill's overshoot in
    // the indeterminate animation look like the CSS keyframes.
    // R-010: `.progress-bar__track` → `grid-area: track`, written as a row 2
    // span across both columns; `justify-self-stretch` cancels the root's
    // `justify-items-start` so the track still fills the root's width.
    // R-011: `.progress-bar__track` → `@apply h-2`, the default (`md`) height;
    // the size variants below restate it.
    track:
      "relative overflow-hidden rounded-sm bg-default col-start-1 row-start-2 col-span-2 justify-self-stretch h-2",
    // R-012: `.progress-bar__fill` → `@apply absolute start-0 top-0 h-full
    // rounded-sm`.
    // R-004: `.progress-bar` sets `--progress-bar-fill: var(--accent)`, the
    // default color; a custom property does not inherit in NSH, so the token
    // lands on the painted slot as `bg-accent`.
    // R-013: `.progress-bar__fill` → `background-color:
    // var(--progress-bar-fill)`: the color variants below replace `bg-accent`.
    fill: "absolute start-0 top-0 h-full rounded-sm bg-accent",
  },
  variants: {
    // A color only repaints the fill.
    color: {
      // R-026: `.progress-bar--default` → `--progress-bar-fill:
      // var(--default-foreground)`.
      default: { fill: "bg-default-foreground" },
      // R-027: `.progress-bar--accent` → `--progress-bar-fill: var(--accent)`.
      accent: { fill: "bg-accent" },
      // R-028: `.progress-bar--success` → `--progress-bar-fill: var(--success)`.
      success: { fill: "bg-success" },
      // R-029: `.progress-bar--warning` → `--progress-bar-fill: var(--warning)`.
      warning: { fill: "bg-warning" },
      // R-030: `.progress-bar--danger` → `--progress-bar-fill: var(--danger)`.
      danger: { fill: "bg-danger" },
    },
    // A size sets the track height and the corner radius of both boxes.
    size: {
      // R-021: `.progress-bar--sm .progress-bar__track` → `@apply h-1
      // rounded-xs`.
      // R-022: `.progress-bar--sm .progress-bar__fill` → `@apply rounded-xs`.
      sm: { track: "h-1 rounded-xs", fill: "rounded-xs" },
      // R-023: `.progress-bar--md` has no declarations (the default size);
      // the base slots already carry `h-2` and `rounded-sm`. The value stays so
      // the dimension matches HeroUI's.
      md: {},
      // R-024: `.progress-bar--lg .progress-bar__track` → `@apply h-3
      // rounded-md`.
      // R-025: `.progress-bar--lg .progress-bar__fill` → `@apply rounded-md`.
      lg: { track: "h-3 rounded-md", fill: "rounded-md" },
    },
  },
  defaultVariants: {
    color: "accent",
    size: "md",
  },
});

export type ProgressBarVariants = VariantProps<typeof progressBarVariants>;
