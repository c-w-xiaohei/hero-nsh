import type { VariantProps } from "tailwind-variants";

import { tv } from "tailwind-variants";

/**
 * DisclosureGroup's variant table, mirroring `@heroui/styles` 3.2.7
 * `packages/styles/src/components/disclosure-group/disclosure-group.styles.ts`
 * plus the 2 declarations of `packages/styles/components/disclosure-group.css`.
 *
 * HeroUI's table has one slot and no dimension at all. R-021 (`contain: layout
 * style`) has no NSH counterpart and is dropped; R-022 keeps the slot key with
 * a real class string (port sheet §4).
 */
export const disclosureGroupVariants = tv({
  slots: {
    // R-020: `.disclosure-group` → `@apply w-full`.
    base: "w-full",
  },
  variants: {},
  defaultVariants: {},
});

export type DisclosureGroupVariants = VariantProps<typeof disclosureGroupVariants>;
