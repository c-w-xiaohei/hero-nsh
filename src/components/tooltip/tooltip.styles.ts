import type { VariantProps } from "tailwind-variants";

import { tv } from "tailwind-variants";

/**
 * Tooltip's variant table, mirroring `@heroui/styles` 3.2.7
 * `packages/styles/src/components/tooltip/tooltip.styles.ts` and the CSS block
 * `packages/styles/components/tooltip.css`.
 *
 * HeroUI has no variant axis here, so the table is the two slots its CSS
 * carries and nothing else.
 */
export const tooltipVariants = tv({
  slots: {
    // R-001 `.tooltip` → `max-w-xs bg-overlay p-2 text-xs` (`text-xs` reaches
    // the inner `Text` through NSH's text inheritance); R-004
    // `border-radius: min(32px, var(--radius-xl))` → `rounded-xl` (12px in this
    // theme, the smaller of the two); R-005 `box-shadow: var(--overlay-shadow)`
    // → the overlay shadow pair, which cannot switch with the appearance.
    //
    // R-006's 150ms `ease-smooth` enter sits on the base so the duration and
    // curve stay applied after the starting classes come off (a transition
    // needs both at the destination); R-011 overrides the duration inline for
    // the 100ms exit.
    //
    // R-003 `break-all` is not written: NSH's text layout has no `word-break`,
    // so an unbreakable long word may overflow (registered in port sheet §8).
    base: "max-w-xs bg-overlay p-2 text-xs rounded-xl shadow-overlay dark:shadow-overlay-dark duration-150 ease-smooth",
    // R-016 `.tooltip__trigger` → `inline-block` (NSH resolves it to
    // `display: block`, the same computed result inside a flex parent); R-017
    // the three transitions (the property list is the inline
    // `transitionProperty`, because one element has one curve); R-018
    // `motion-reduce:transition-none`, with reduce-motion also clearing the
    // inline list in the part, since an inline value beats the class.
    trigger:
      "inline-block duration-150 ease-smooth transition-colors transition-shadow motion-reduce:transition-none",
  },
});

export type TooltipVariants = VariantProps<typeof tooltipVariants>;
