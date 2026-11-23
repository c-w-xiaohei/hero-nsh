import type { VariantProps } from "tailwind-variants";

import { tv } from "tailwind-variants";

// `ease.smooth` and `shadow.overlay.both` of `src/tokens/geometry.ts` written
// out: the M2 class walker imports this file through Node ESM, which does not
// resolve extensionless relative specifiers, so the geometry module cannot be
// imported from a `.styles.ts`. Same pattern as `tooltip.styles.ts` /
// `switch.styles.ts`; keep in sync with `SHADOW_VALUES.overlay` and
// `EASE_VALUES.smooth`.
const EASE_SMOOTH = "ease-[cubic-bezier(0.25,0.1,0.25,1)]";
const SHADOW_OVERLAY_BOTH =
  "shadow-[0_2px_8px_0_rgba(0,0,0,0.06),0_-6px_12px_0_rgba(0,0,0,0.03),0_14px_28px_0_rgba(0,0,0,0.08)] dark:shadow-[0_0_1px_0_rgba(255,255,255,0.3)_inset]";

/**
 * Popover's variant table, mirroring `@heroui/styles` 3.2.7
 * `packages/styles/src/components/popover/popover.styles.ts` and the CSS block
 * `packages/styles/components/popover.css`.
 *
 * There is no variant axis upstream, so the table is four slots (the four
 * variant classes HeroUI's CSS carries) and nothing else.
 */
export const popoverVariants = tv({
  slots: {
    // R-001 `.popover` → `bg-overlay p-0 text-sm`; R-002 radius min(32px,
    // --radius-3xl) → `rounded-3xl` (24px in this theme); R-003
    // `box-shadow: var(--overlay-shadow)` → the surface/overlay shadow pair.
    // The enter duration and curve live here so they stay applied while the
    // starting classes come off (a transition needs its duration at the
    // destination too); R-010's 100ms exit overrides the duration inline,
    // where the exit phase also owns `transitionProperty`.
    base: `bg-overlay p-0 text-sm text-overlay-foreground rounded-3xl ${SHADOW_OVERLAY_BOTH} duration-150 ${EASE_SMOOTH}`,
    // R-015 `.popover__dialog` → `p-4 outline-none`.
    dialog: "p-4 outline-none",
    // R-016 `.popover__heading` → `font-medium`.
    heading: "font-medium",
    // R-017 `.popover__trigger` → `inline-block`; `w-fit` restores the
    // shrink-to-content box of the inline element, which NSH would otherwise
    // stretch in a column parent (skill §4.2). R-018 / R-019 the transition
    // (the property list is the inline `transitionProperty`, because colors and
    // box-shadow share one curve here); R-020 `cursor-interactive` → pointer.
    trigger:
      `inline-block w-fit cursor-pointer duration-150 ${EASE_SMOOTH} motion-reduce:transition-none`,
  },
});

export type PopoverVariants = VariantProps<typeof popoverVariants>;
