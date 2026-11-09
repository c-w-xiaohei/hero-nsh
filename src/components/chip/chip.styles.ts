import type { VariantProps } from "tailwind-variants";

import { tv } from "tailwind-variants";

/**
 * Chip's variant table, mirroring `@heroui/styles` 3.2.7
 * `packages/styles/src/components/chip/chip.styles.ts` plus the declarations of
 * `packages/styles/components/chip.css`.
 *
 * HeroUI's table only produces BEM class names (`chip`, `chip__label`,
 * `chip--<color|size|variant>` and the compound `chip--<variant>.chip--<color>`)
 * and every declaration lives in the CSS file. NSH has no BEM CSS (D18), so
 * each block is expanded here into the declarations it applied:
 *
 * - the two block / element rules are the `base` and `label` slots;
 * - a color only sets the foreground (`text-*-soft-foreground`);
 * - `tertiary` sets a transparent background and the other variant names are
 *   empty, exactly like their CSS blocks;
 * - the solid and soft backgrounds are `compoundVariants`, one per
 *   `chip--<variant>.chip--<color>` selector.
 *
 * `inline-flex` becomes `flex` (NSH has no inline layout context, so the row
 * is block level) plus `w-fit` for the shrink-to-content width it had inside a
 * line; the inline-participation difference is registered in port sheet §8.
 */
export const chipVariants = tv({
  slots: {
    // R-001: `.chip` → `inline-flex w-fit shrink-0 items-center gap-0.5
    // rounded-2xl px-2 py-0.5 text-xs leading-5 font-medium`. `rounded-2xl` is
    // the theme's 16, `gap-0.5` / `py-0.5` are 2, `px-2` is 8, `text-xs` is
    // 12 / 20 and `leading-5` is 20. `shrink-0` matches NSH's default
    // `flexShrink: 0`; it is written to stay line-for-line with the CSS.
    // R-002: `.chip` → `--chip-bg: var(--default)` + `background-color:
    // var(--chip-bg)` → `bg-default`: the local variable disappears and the
    // semantic color class switches with the appearance by itself.
    base: "flex w-fit shrink-0 items-center gap-0.5 rounded-2xl bg-default px-2 py-0.5 text-xs leading-5 font-medium",
    // R-004: `.chip__label` → `@apply px-0.5` (2). Only applied while the
    // label sits inside a `Chip`; outside it has no slot class upstream either,
    // only the caller's `className`.
    label: "px-0.5",
  },
  variants: {
    // Each color rule only rewrites `--chip-fg`; the token behind it already
    // follows the appearance.
    color: {
      accent: { base: "text-accent-soft-foreground" }, // R-005
      danger: { base: "text-danger-soft-foreground" }, // R-006
      default: { base: "text-default-foreground" }, // R-007
      success: { base: "text-success-soft-foreground" }, // R-008
      warning: { base: "text-warning-soft-foreground" }, // R-009
    },
    size: {
      // R-013: `.chip--sm` → `px-1 py-0 text-xs` (4 / 0 / 12). `leading-4` is
      // required: the block resets `text-xs` after `.chip`, which moves the
      // line height from 20 to 16, and NSH's `leading-*` overrides a
      // `text-<size>` leading wherever it sits in the string.
      sm: { base: "px-1 py-0 text-xs leading-4" },
      // R-014: `.chip--md` has no declarations (it is the default size); the
      // variant value stays so the API surface matches HeroUI's.
      md: { base: "" },
      // R-015: `.chip--lg` → `px-3 py-1 text-sm font-medium` (12 / 4 / 14 / 20).
      lg: { base: "px-3 py-1 text-sm font-medium" },
    },
    variant: {
      // R-010: `.chip--primary` has no declarations; the solid backgrounds
      // are the `primary` compound variants below.
      primary: { base: "" },
      // R-011: `.chip--secondary` has no declarations (the default variant).
      secondary: { base: "" },
      // `.chip--soft` has no block of its own either; the soft backgrounds are
      // the compound variants below.
      soft: { base: "" },
      // R-012: `.chip--tertiary` → `--chip-bg: transparent`, written after
      // `bg-default` so it wins.
      tertiary: { base: "bg-transparent" },
    },
  },
  compoundVariants: [
    // R-016 … R-019: the solid `primary` backgrounds and their foregrounds.
    { variant: "primary", color: "accent", class: { base: "bg-accent text-accent-foreground" } }, // R-016
    { variant: "primary", color: "success", class: { base: "bg-success text-success-foreground" } }, // R-017
    { variant: "primary", color: "warning", class: { base: "bg-warning text-warning-foreground" } }, // R-018
    { variant: "primary", color: "danger", class: { base: "bg-danger text-danger-foreground" } }, // R-019
    // R-020 … R-024: the `soft` backgrounds and their foregrounds. HeroUI has
    // no `primary + default` compound either, so that pair keeps the base
    // `bg-default` / `text-default-foreground` (R-019 note in the port sheet).
    { variant: "soft", color: "accent", class: { base: "bg-accent-soft text-accent-soft-foreground" } }, // R-020
    { variant: "soft", color: "success", class: { base: "bg-success-soft text-success-soft-foreground" } }, // R-021
    { variant: "soft", color: "warning", class: { base: "bg-warning-soft text-warning-soft-foreground" } }, // R-022
    { variant: "soft", color: "danger", class: { base: "bg-danger-soft text-danger-soft-foreground" } }, // R-023
    { variant: "soft", color: "default", class: { base: "bg-default-soft text-default-soft-foreground" } }, // R-024
  ],
  // `size` is deliberately absent, as upstream: an unset size has no size
  // class, and `md` is empty, so both look the same while the variant surface
  // stays identical to HeroUI's (R-014).
  defaultVariants: {
    color: "default",
    variant: "secondary",
  },
});

export type ChipVariants = VariantProps<typeof chipVariants>;
