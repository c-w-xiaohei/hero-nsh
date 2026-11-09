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
 *
 * The table lives with the Disclosure unit (`src/components/disclosure/`) because
 * DisclosureGroup ships as part of it: `Disclosure.Root` resolves its expanded
 * state through `DisclosureGroupContext` (`./disclosure-root.tsx`), the two are
 * exported from one unit and one port sheet, and the group owns a single style
 * rule. `../disclosure-group/disclosure-group.styles.ts` re-exports this table so
 * the public path does not move.
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
