import type { VariantProps } from "tailwind-variants";

import { tv } from "tailwind-variants";

/**
 * ColorSlider's variant table, mirroring `@heroui/styles` 3.2.7
 * `packages/styles/src/components/color-slider/color-slider.styles.ts` plus the
 * declarations of `packages/styles/components/color-slider.css`.
 *
 * Upstream's table only names the four BEM blocks; NSH has no BEM CSS and no
 * descendant selectors (D18), so the stylesheet's rules are expanded against
 * the same four slots (`base`, `output`, `track`, `thumb`). ColorSlider has no
 * variant dimensions — `colorSliderVariants` takes nothing and
 * `ColorSliderVariants` is the empty object — so the two things upstream
 * switches on live elsewhere:
 *
 * - orientation (`data-orientation`) and the four `:has()` collapse cases are
 *   computed class strings in the parts that own them (Root, Output, Track,
 *   Thumb), because each depends on a registration signal;
 * - state (`data-dragging`, `data-focus-visible`, `data-disabled` and the root's
 *   `status-disabled`) is a `classList` in the same parts.
 *
 * Both are written in HeroUI's cascade order (base block, then the horizontal
 * overrides, then the vertical ones) so later classes keep winning exactly
 * where the upstream cascade did.
 */
export const colorSliderVariants = tv({
  slots: {
    // R-001: `.color-slider` → `display: grid` → `grid`.
    // R-001: `.color-slider` → `width: 100%` → `w-full`.
    // R-001: `.color-slider` → `gap: 4` → `gap-1`.
    // R-003: `.color-slider` → `grid-template-columns: 1fr auto` →
    // `grid-cols-[1fr_auto]`. A vertical root overrides it with one column
    // (R-050), and so do three of the four existence cases (R-006).
    // R-004: `.color-slider` → `grid-template-rows: auto auto` →
    // `grid-rows-[auto_auto]`. A vertical root overrides the rows too (R-049 /
    // R-054 / R-057 / R-059).
    base: "grid w-full gap-1 grid-cols-[1fr_auto] grid-rows-[auto_auto]",
    // R-016: `.color-slider__output` → `font-size: 14` → `text-sm`.
    // R-016: `.color-slider__output` → `font-weight: 500` → `font-medium`.
    // R-016: `.color-slider__output` → `font-variant-numeric: tabular-nums`
    // → `tabular-nums`.
    output: "text-sm font-medium tabular-nums",
    // R-018: `.color-slider__track` → `position: relative` → `relative`.
    // R-018's `rounded-2xl` is dead: both orientation blocks restate
    // `rounded-none` (R-032 / R-062), so the radius is always 0 and only the
    // orientation's class is written.
    track: "relative",
    // R-021: `.color-slider__thumb` → `position: absolute` → `absolute`.
    // R-021: `.color-slider__thumb` → `display: flex` → `flex`; its
    // `align-items` / `justify-content` are the two centering utilities.
    // R-021: `.color-slider__thumb` → `cursor: grab` → `cursor-grab`.
    // R-021: `.color-slider__thumb` → `border-radius: 1rem` → `rounded-2xl`.
    // R-021's `no-highlight` is dropped: an NSH view has no tap highlight.
    // R-022: `.color-slider__thumb` → `border-width: 3` → `border-3`.
    // R-022: `.color-slider__thumb` → `border-color: white` → `border-white`.
    // R-022: `.color-slider__thumb` → `box-shadow: var(--overlay-shadow)` →
    // `shadow-overlay`, with the dark half the theme notes require.
    // R-023: `.color-slider__thumb` → `z-index: 1` → `z-1`.
    // R-024: `.color-slider__thumb` → `transition: transform 250ms
    // var(--ease-out), box-shadow 150ms var(--ease-out)`. No state of this
    // component changes `transform` (`translate` is a constant), so only the
    // shadow half is observable; `transition-shadow` / `duration-150` /
    // `ease-out` are that half (port sheet §4, R-024).
    // R-025: `.color-slider__thumb` → `motion-reduce:transition-none` →
    // `motion-reduce:transition-none`.
    thumb:
      "absolute flex items-center justify-center rounded-2xl cursor-grab border-3 border-white shadow-overlay dark:shadow-overlay-dark z-1 transition-shadow duration-150 ease-out motion-reduce:transition-none",
  },
});

export type ColorSliderVariants = VariantProps<typeof colorSliderVariants>;
