import type { VariantProps } from "tailwind-variants";

import { tv } from "tailwind-variants";

/**
 * Meter's variant table, mirroring `@heroui/styles` 3.2.7
 * `packages/styles/src/components/meter/meter.styles.ts` plus every
 * declaration of `packages/styles/components/meter.css`.
 *
 * Upstream's table only names BEM blocks; NSH has no BEM CSS and no descendant
 * selectors (D18), so the stylesheet's rules are expanded here against four
 * slots (`base`, `output`, `track`, `fill`). The layout is the one place where
 * the port is structural rather than literal: the CSS grid uses named areas,
 * and NSH has none (port sheet §4, R-004 / R-010 / R-014 / R-019).
 *
 * The rule order is upstream's — the base block first, then `size`, then
 * `color` — so later classes win exactly where the upstream cascade did.
 */
export const meterVariants = tv({
  slots: {
    // R-001: `.meter` → `display: grid` → `grid`.
    // R-002: `.meter` → `width: 100%` → `w-full`.
    // R-003: `.meter` → `gap: 4` → `gap-1`.
    // R-005: `.meter` → `grid-template-columns: 1fr auto` →
    // `grid-cols-[1fr_auto]`.
    // R-007: `.meter [data-slot="label"]` → `width: fit-content`; NSH cannot
    // class another component's part, so the grid's single auto-placed item
    // (the independent Label) is sized by content through
    // `justify-items-start`. A caller's extra non-part child aligns the same
    // way; registered in §8.
    // R-008 / R-009: `.meter [data-slot="label"]` → `font-size: 14` and
    // `font-weight: 500`. The independent Label's own base already carries
    // `text-sm font-medium`, so Meter hands it no class of its own (the
    // stylesheet's only other option, a descendant selector, has no NSH form).
    //
    // R-004 / R-010 (structural): the CSS names the areas `label output` /
    // `track track`. NSH has no `grid-template-areas`; the slots that are ours
    // place themselves explicitly (Output `col-start-2 row-start-1`, Track
    // `col-span-2 row-start-2`), so the only cell left for automatic placement
    // is row 1 / column 1 — where the CSS puts the label, whatever order the
    // caller writes the parts in.
    base: "grid w-full gap-1 grid-cols-[1fr_auto] justify-items-start",
    // R-011: `.meter .meter__output` → `font-size: 14` → `text-sm`.
    // R-012: `.meter .meter__output` → `font-weight: 500` → `font-medium`.
    // R-013: `.meter .meter__output` → `font-variant-numeric: tabular-nums`
    // → `tabular-nums`.
    // R-014: `.meter .meter__output` → `grid-area: output`; NSH writes the
    // cell explicitly and pins the text to the column's end, which is what
    // the `auto` column did.
    output: "text-sm font-medium tabular-nums col-start-2 row-start-1 justify-self-end",
    // R-015: `.meter .meter__track` → `position: relative` → `relative`.
    // R-016: `.meter .meter__track` → `overflow: hidden` → `overflow-hidden`.
    // R-017: `.meter .meter__track` → `border-radius: 4` → `rounded-sm`.
    // R-018: `.meter .meter__track` → `background-color: var(--default)` →
    // `bg-default`; the token follows the appearance by itself.
    // R-019: `.meter .meter__track` → `grid-area: track`; spans both columns
    // and cancels the root's `justify-items-start` so it fills the width.
    // R-020: `.meter .meter__track` → `height: 8` (`h-2`, the md default; the
    // medium values live in the base block upstream too).
    track:
      "relative overflow-hidden rounded-sm bg-default h-2 col-span-2 row-start-2 justify-self-stretch",
    // R-021: `.meter .meter__fill` → `position: absolute` → `absolute`.
    // R-022: `.meter .meter__fill` → `inset-inline-start: 0` → `start-0`.
    // R-023: `.meter .meter__fill` → `top: 0` → `top-0`.
    // R-024: `.meter .meter__fill` → `height: 100%` → `h-full`.
    // R-025: `.meter .meter__fill` → `border-radius: 4` → `rounded-sm`.
    // R-006 / R-026: `--meter-fill: var(--accent)` and
    // `background-color: var(--meter-fill)`. NSH has no component-local custom
    // property, so the fill paints `bg-accent` here and the `color` variant
    // swaps the whole slot class (R-038 … R-042).
    fill: "absolute start-0 top-0 h-full rounded-sm bg-accent",
  },
  variants: {
    // R-031 … R-037: the size blocks upstream only scope declarations onto the
    // track and the fill; md's values are in the base block, which is why
    // `.meter--md` is empty upstream and `md: {}` here (R-034).
    size: {
      // R-031: `.meter--sm .meter__track` → `height: 4` → `h-1`.
      // R-032: `.meter--sm .meter__track` → `border-radius: 2` → `rounded-xs`.
      // R-033: `.meter--sm .meter__fill` → `border-radius: 2` → `rounded-xs`.
      sm: {
        track: "h-1 rounded-xs",
        fill: "rounded-xs",
      },
      // R-034: `.meter--md` is an empty block upstream.
      md: {},
      // R-035: `.meter--lg .meter__track` → `height: 12` → `h-3`.
      // R-036: `.meter--lg .meter__track` → `border-radius: 6` → `rounded-md`.
      // R-037: `.meter--lg .meter__fill` → `border-radius: 6` → `rounded-md`.
      lg: {
        track: "h-3 rounded-md",
        fill: "rounded-md",
      },
    },
    // R-038 … R-042: the upstream color blocks only set `--meter-fill`; the
    // value becomes the fill slot's background class, which lands after the
    // base `bg-accent` in the class string.
    color: {
      // R-038: `.meter--default` → `--meter-fill: var(--default-foreground)`.
      default: {
        fill: "bg-default-foreground",
      },
      // R-039: `.meter--accent` → `--meter-fill: var(--accent)` (same value as
      // the base; kept so the table matches upstream line for line).
      accent: {
        fill: "bg-accent",
      },
      // R-040: `.meter--success` → `--meter-fill: var(--success)`.
      success: {
        fill: "bg-success",
      },
      // R-041: `.meter--warning` → `--meter-fill: var(--warning)`.
      warning: {
        fill: "bg-warning",
      },
      // R-042: `.meter--danger` → `--meter-fill: var(--danger)`.
      danger: {
        fill: "bg-danger",
      },
    },
  },
  defaultVariants: {
    color: "accent",
    size: "md",
  },
});

export type MeterVariants = VariantProps<typeof meterVariants>;

export type MeterColor = NonNullable<MeterVariants["color"]>;

export type MeterSize = NonNullable<MeterVariants["size"]>;
