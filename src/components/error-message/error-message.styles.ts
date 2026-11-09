import type { VariantProps } from "tailwind-variants";

import { tv } from "tailwind-variants";

/**
 * ErrorMessage's variant table, mirroring `@heroui/styles` 3.2.7
 * `packages/styles/src/components/error-message/error-message.styles.ts`.
 *
 * HeroUI's table has no dimensions: `tv({ base: "error-message" })`, with every
 * declaration in the BEM block's CSS. NSH has no BEM CSS (D18), so the block's
 * declarations live in `base` here, or are deleted where they have no meaning
 * in NSH (port sheet §4).
 */
export const errorMessageVariants = tv({
  // R-002: `.error-message` → `font-size: 12px; line-height: 16px` (`text-xs`).
  // R-004: `.error-message` → `color: var(--danger)` (`text-danger`); the
  // semantic color follows the appearance by itself.
  // R-001 (`h-auto`) is deleted: the component has no `h-0` collapsed state,
  // so a mounted Text already has content height.
  // R-003 (`wrap-break-word`, `overflow-wrap: break-word`) is deleted: NSH has
  // neither that class nor an `overflowWrap` style key, so a long unbroken
  // token overflows instead of breaking; port sheet §8.
  // R-005 (the opacity / height transition) and R-006
  // (`motion-reduce:transition-none`) are deleted: upstream never plays them
  // either — no opacity state switches and `height: auto` cannot animate — so
  // keeping them would only be dead code.
  base: "text-xs text-danger",
});

export type ErrorMessageVariants = VariantProps<typeof errorMessageVariants>;
