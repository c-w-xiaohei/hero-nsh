import type { VariantProps } from "tailwind-variants";

import { tv } from "tailwind-variants";

import { ease } from "../../tokens/geometry";

/**
 * Slider's variant table, mirroring `@heroui/styles` 3.2.7
 * `packages/styles/src/components/slider/slider.styles.ts` plus the block
 * declarations of `packages/styles/components/slider.css`.
 *
 * HeroUI's table has no dimensions: `sliderVariants` has nine slots and
 * `SliderVariants` is an empty object. Orientation and text direction are not
 * variants either — they change the strings a part adds (`h-5 w-full` versus
 * `h-full w-5`, `-translate-x-1/2` versus `translate-x-1/2`) and the inline
 * percentages, so the dimensions stay exactly HeroUI's.
 *
 * The block's `grid-template-areas` and the thumb's `::after` have no NSH
 * counterpart; the port sheet moves the first onto each part's grid lines and
 * the second onto a real child view (section 4, R-002 / R-027).
 */
export const sliderVariants = tv({
  slots: {
    // R-001: `.slider` → `@apply grid w-full gap-1`.
    // R-003: `.slider` → `grid-template-columns: 1fr auto` (horizontal). The
    // vertical root replaces the columns in `slider-root.tsx` (R-054 / R-056).
    base: "grid w-full gap-1 grid-cols-[1fr_auto]",
    // R-006: `.slider__output` → `@apply text-sm font-medium tabular-nums`.
    output: "text-sm font-medium text-foreground tabular-nums",
    // R-008: `.slider__track` → `@apply relative rounded-xl bg-default`.
    track: "relative rounded-xl bg-default",
    // R-010: `.slider__fill` → `@apply pointer-events-none absolute bg-accent`.
    fill: "pointer-events-none absolute bg-accent",
    // R-011: `.slider__steps` → `@apply pointer-events-none absolute inset-0 z-1`.
    steps: "pointer-events-none absolute inset-0 z-1",
    // R-012: `.slider__step` → `@apply absolute size-[3px] rounded-full
    // bg-muted/25`.
    step: "absolute size-[3px] rounded-full bg-muted/25",
    // R-014: `.slider__marks` → `@apply grid`. The track template follows the
    // orientation in `slider-marks.tsx` (R-016 / R-059).
    marks: "grid",
    // R-017: `.slider__mark` → `@apply relative w-max text-xs text-muted
    // tabular-nums`.
    // R-019: `.slider__mark` → `justify-self: start`.
    // R-020: `.slider__mark` → `transition: color 200ms var(--ease-smooth)`.
    // R-021: `.slider__mark` → `@apply motion-reduce:transition-none`.
    mark: `relative w-max text-xs text-muted tabular-nums justify-self-start transition-colors duration-200 ${ease.smooth} motion-reduce:transition-none`,
    // R-023: `.slider__thumb` → `@apply absolute z-2 flex cursor-grab
    // items-center justify-center rounded-xl bg-accent`. `no-highlight` (R-024)
    // is dropped: an NSH native view has no tap highlight.
    // R-025: `.slider__thumb`'s `transition: background-color 250ms
    // var(--ease-smooth), transform 250ms var(--ease-out), box-shadow 150ms
    // var(--ease-out)` collapses into NSH's one duration and one curve,
    // `duration-[250ms] ease-smooth` (port sheet section 8).
    // R-026: `.slider__thumb` → `@apply motion-reduce:transition-none`.
    thumb:
      `absolute z-2 flex cursor-grab items-center justify-center rounded-xl bg-accent transition duration-[250ms] ${ease.smooth} motion-reduce:transition-none`,
  },
});

export type SliderVariants = VariantProps<typeof sliderVariants>;
