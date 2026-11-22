import type { VariantProps } from "tailwind-variants";

import { tv } from "tailwind-variants";

// `ease.smooth` and `shadow.overlay.both` of `src/tokens/geometry.ts` written
// out: the M2 class walker imports this file through Node ESM, which does not
// resolve extensionless relative specifiers, so the geometry module cannot be
// imported from a `.styles.ts`. Same pattern as `switch.styles.ts` /
// `button.styles.ts`; keep in sync with `SHADOW_VALUES.overlay` and
// `EASE_VALUES.smooth`.
const EASE_SMOOTH = "ease-[cubic-bezier(0.25,0.1,0.25,1)]";
const SHADOW_OVERLAY_BOTH =
  "shadow-[0_2px_8px_0_rgba(0,0,0,0.06),0_-6px_12px_0_rgba(0,0,0,0.03),0_14px_28px_0_rgba(0,0,0,0.08)] dark:shadow-[0_0_1px_0_rgba(255,255,255,0.3)_inset]";

/**
 * Tooltip's variant table, mirroring `@heroui/styles` 3.2.7
 * `packages/styles/src/components/tooltip/tooltip.styles.ts` and the CSS block
 * `packages/styles/components/tooltip.css`.
 *
 * HeroUI has no variant axis here, so the table is the two slots its CSS
 * carries and nothing else.
 *
 * A-005: no `input` / `density` axis either — the tip is not a press target
 * (the hit area belongs to the element it wraps) and its `p-2 text-xs`
 * density comes from the token layer + the app's density preset.
 */
export const tooltipVariants = tv({
  slots: {
    // R-001 `.tooltip` → `max-w-xs bg-overlay p-2 text-xs` (`text-xs` reaches
    // the inner `Text` through NSH's text inheritance); R-004
    // `border-radius: min(32px, var(--radius-xl))` → `rounded-xl` (12px in this
    // theme, the smaller of the two); R-005 `box-shadow: var(--overlay-shadow)`
    // → the overlay shadow pair, which cannot switch with the appearance.
    //
    // State-specific durations are assigned by classList, keeping one owner.
    //
    // R-003 `break-all` is not written: NSH's text layout has no `word-break`,
    // so an unbreakable long word may overflow (registered in port sheet §8).
    base: `max-w-xs bg-overlay p-2 text-xs text-overlay-foreground rounded-xl ${SHADOW_OVERLAY_BOTH} ${EASE_SMOOTH}`,
    // R-016 `.tooltip__trigger` → `inline-block` (NSH resolves it to
    // `display: block`, the same computed result inside a flex parent); the
    // inline property list is the sole transition-property owner.
    trigger: `inline-block duration-150 ${EASE_SMOOTH}`,
  },
});

export type TooltipVariants = VariantProps<typeof tooltipVariants>;
