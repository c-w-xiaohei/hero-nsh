import type { VariantProps } from "tailwind-variants";

import { tv } from "tailwind-variants";

/**
 * Description's variant table, mirroring `@heroui/styles` 3.2.7
 * `packages/styles/src/components/description/description.styles.ts`.
 *
 * HeroUI's table has no variant dimensions at all: the BEM block
 * (`description`) is the whole surface. Its declarations are expanded here
 * (D18: BEM class names are not carried over).
 */
export const descriptionVariants = tv({
  // R-001: `.description` → `text-xs` (12 / 16).
  // R-002: `.description` → `text-wrap` (lines may wrap).
  // R-004: `.description` → `text-muted` (the semantic color follows the
  // appearance by itself).
  // R-003 (`wrap-break-word`, `overflow-wrap: break-word`) is deleted:
  // NSH has neither that class nor an `overflowWrap` style key, so a long
  // unbroken token overflows instead of breaking; port sheet §8.
  base: "text-xs text-wrap text-muted",
});

export type DescriptionVariants = VariantProps<typeof descriptionVariants>;
