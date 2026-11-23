import type { VariantProps } from "tailwind-variants";

import { tv } from "tailwind-variants";

// `ease.smooth` and `shadow.overlay.both` of `src/tokens/geometry.ts` written
// out: the M2 class walker imports this file through Node ESM, which does not
// resolve extensionless relative specifiers, so the geometry module cannot be
// imported from a `.styles.ts`. Same pattern as `switch.styles.ts` /
// `radio.styles.ts`; keep in sync with `SHADOW_VALUES.overlay` and
// `EASE_VALUES.smooth`.
const EASE_SMOOTH = "ease-[cubic-bezier(0.25,0.1,0.25,1)]";
const SHADOW_OVERLAY_BOTH =
  "shadow-[0_2px_8px_0_rgba(0,0,0,0.06),0_-6px_12px_0_rgba(0,0,0,0.03),0_14px_28px_0_rgba(0,0,0,0.08)] dark:shadow-[0_0_1px_0_rgba(255,255,255,0.3)_inset]";

/**
 * ColorPicker's variant table, mirroring `@heroui/styles` 3.2.7
 * `packages/styles/src/components/color-picker/color-picker.styles.ts` and the
 * CSS block `packages/styles/components/color-picker.css`.
 *
 * Upstream's table names three BEM blocks and carries no variant axis; NSH has
 * no BEM (D18), so the declarations of the stylesheet live here and in the
 * parts. Every rule of port sheet §4.2 is marked at the place it lands;
 * R-119 … R-124 are the enter/exit animations, which `Popover.Content` already
 * owns (popover R-005 … R-010), so this table leaves them there.
 */
export const colorPickerVariants = tv({
  slots: {
    // R-101: `.color-picker` → `inline-flex`. NSH defaults a View to a column,
    // so the direction has to be said here; inline-flex makes a row.
    base: "inline-flex",
    // R-102: `.color-picker__trigger` → `inline-flex items-center gap-3
    // rounded-sm text-sm` (12pt gap, 4pt radius). R-104: `cursor: var(--cursor-
    // interactive)` → `cursor-pointer`. R-105: the transition is two curves
    // upstream (background-color 150ms smooth, box-shadow 150ms out); NSH has
    // one curve per element, so the part writes the property list inline and
    // both halves take `ease-smooth` (port sheet §8). R-106: motion-reduce.
    // R-103 (`-webkit-tap-highlight-color`), R-107 (`[data-slot="label"]`
    // cursor, which inherits here) and R-108 / R-109 (the focus ring and the
    // disabled look, already on `Popover.Trigger`) are not repeated here: one
    // owner per property.
    trigger:
      `inline-flex items-center gap-3 rounded-sm text-sm cursor-pointer duration-150 ${EASE_SMOOTH} motion-reduce:transition-none`,
    // R-110: `.color-picker__popover` → `min-w-62` (62 × 4pt = 248).
    // R-114: `bg-overlay px-2 pt-2 pb-3`. R-115: `box-shadow:
    // var(--overlay-shadow)` → the surface/overlay pair (theme notes: a shadow
    // cannot switch with the appearance, so both halves are written).
    // R-116: `border-radius: min(32px, calc(var(--radius) * 2.5))` — with
    // HeroUI's default `--radius: 0.5rem` that is 20pt, and NSH's `rounded-*`
    // takes no `calc()` (port sheet §8). It sits after `Popover.Content`'s
    // `rounded-3xl`, so this slot wins. R-117: `flex flex-col gap-3`.
    // R-118: `outline-none` on the popover itself.
    // R-111 (`origin` — `Popover.Content` computes the anchor point),
    // R-112 (`scrollbar-none` — not a class in NSH) and R-113 (`overflow-*` /
    // `overscroll-*` — no channel; port sheet §8) are deleted.
    popover:
      `min-w-[248px] bg-overlay text-overlay-foreground px-2 pt-2 pb-3 ${SHADOW_OVERLAY_BOTH} rounded-[20px] flex flex-col gap-3 outline-none`,
  },
});

export type ColorPickerVariants = VariantProps<typeof colorPickerVariants>;
