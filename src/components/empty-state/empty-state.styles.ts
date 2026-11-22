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
 *
 * Mobile adaptation (encapsulation.md §1, 样式管线): the environment adds one
 * variant axis the Root feeds from `createDensity()`. `density` owns the
 * padding literal (adapt sheet A-001): `p-2` moves out of the base into
 * `density` cells so a `compact` preset tightens it one step. `block`,
 * `text-sm` and `text-muted` stay in the base — `block` is the layout
 * contract and the size/color are the typography contract, so no text- or
 * leading- class may appear in a density cell (sheet A-001, the same split
 * as alert A-001 / card A-001 / breadcrumbs A-002). The component keeps no
 * `input` axis (sheet A-003): it is a non-interactive display container, so
 * there is no hover dependency or hit-area literal for touch to resolve.
 */
export const emptyStateVariants = tv({
  // R-001: `.empty-state` → `p-2` (padding: 8), on the root view — the value
  // moved into the `density` axis below (A-001), whose `default` cell is the
  // identical `p-2`.
  // R-002: `.empty-state` → `text-sm` (font-size 14, line-height 20). Text
  // utilities on a view inherit to the `Text` elements inside it (twref "Text
  // styles inherit"), which is CSS's `font-size` / `line-height` inheritance.
  // R-003: `.empty-state` → `text-muted` (semantic color; the theme has a value
  // for both appearances, so it switches by itself).
  // `block`: upstream's `empty-state.css` sets no `display`, so the root is a
  // block `div`. An NSH view with no display utility keeps the column-flex
  // default, which would lay the caller's children out as flex items
  // (research 3.1: every root part declares its display).
  base: "block text-sm text-muted",
  variants: {
    // A-001: the `density` axis owns the root padding literal, spacing the
    // environment varies. `default` is the current `p-2` (8 points);
    // `compact` tightens it one step to `p-1.5` (6 points). Variant classes
    // apply after the base, so the cell wins without a merge helper.
    density: {
      default: "p-2",
      compact: "p-1.5",
    },
  },
  defaultVariants: {
    density: "default",
  },
});

/**
 * Upstream's table has no variant dimensions; the `density` axis here is the
 * environment's, fed by the Root from `createDensity()` — callers do not set
 * it (adapt sheet §3: it is not a contract prop).
 */
export type EmptyStateVariants = VariantProps<typeof emptyStateVariants>;
