import type { VariantProps } from "tailwind-variants";

import { tv } from "tailwind-variants";

/**
 * EmptyState's variant table, mirroring `@heroui/styles` 3.2.7
 * `packages/styles/src/components/empty-state/empty-state.styles.ts` plus the
 * declarations of `packages/styles/components/empty-state.css`.
 *
 * HeroUI's table is `tv({ base: "empty-state" })`: one static BEM block and no
 * variant dimensions, no slots, no default variants. The BEM class name itself
 * is not carried over (D18); its three declarations are expanded here in
 * source order. HeroUI passes the caller's `className` through
 * `emptyStateVariants({ className })`, so it lands after `base` and wins
 * without a merge.
 */
export const emptyStateVariants = tv({
  // R-001: `.empty-state` → `p-2` (padding: 8), on the root view.
  // R-002: `.empty-state` → `text-sm` (font-size 14, line-height 20). Text
  // utilities on a view inherit to the `Text` elements inside it (twref "Text
  // styles inherit"), which is CSS's `font-size` / `line-height` inheritance.
  // R-003: `.empty-state` → `text-muted` (semantic color; the theme has a value
  // for both appearances, so it switches by itself).
  // `block`: upstream's `empty-state.css` sets no `display`, so the root is a
  // block `div`. An NSH view with no display utility keeps the column-flex
  // default, which would lay the caller's children out as flex items
  // (research 3.1: every root part declares its display).
  base: "block p-2 text-sm text-muted",
});

export type EmptyStateVariants = VariantProps<typeof emptyStateVariants>;
