import type { VariantProps } from "tailwind-variants";

import { tv } from "tailwind-variants";

/**
 * FieldError's variant table, mirroring `@heroui/styles` 3.2.7
 * `packages/styles/src/components/field-error/field-error.styles.ts`.
 *
 * HeroUI's table has no dimensions: `tv({ base: "field-error" })`, with every
 * declaration in the BEM block's CSS. NSH has no BEM CSS (D18), so the block's
 * declarations live in `base` or in the component's `classList` where they
 * depend on the field (port sheet §4).
 */
export const fieldErrorVariants = tv({
  // R-003: `.field-error` → `font-size: 12px; line-height: 16px` (`text-xs`).
  base: "text-xs",
});

export type FieldErrorVariants = VariantProps<typeof fieldErrorVariants>;
