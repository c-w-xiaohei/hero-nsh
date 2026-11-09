import type { VariantProps } from "tailwind-variants";

import { tv } from "tailwind-variants";

/**
 * Skeleton's variant table, mirroring `@heroui/styles` 3.2.7
 * `packages/styles/src/components/skeleton/skeleton.styles.ts` plus the
 * declarations of `packages/styles/components/skeleton.css`.
 *
 * HeroUI's table has one dimension (`animationType`) and one slot (`base`).
 * NSH has no BEM CSS (D18), so the block's declarations live in the `base`
 * slot and each modifier becomes the declarations its rule applies. The
 * shimmer is not a class at all: its pseudo-element is a real child view and
 * its animation is a native `createAnimatedValue`; see `skeleton.tsx`.
 */
export const skeletonVariants = tv({
  slots: {
    // R-001: `.skeleton` → `pointer-events-none`: a press never reaches the
    // placeholder.
    // R-002: `.skeleton` → `relative`: the shimmer overlay is positioned
    // against this box.
    // R-003: `.skeleton` → `overflow-hidden`: clips the shimmer and any child
    // content that overflows.
    // R-004: `.skeleton` → `rounded-sm` (`calc(var(--radius) * 0.5)`, 4 in
    // HeroUI's default theme and 4 in this repo's `tailwind.radius.sm`).
    // R-005: `.skeleton` → `bg-surface-tertiary/70`: the semantic token follows
    // the appearance; `/70` is the alpha.
    // `block`: upstream's `skeleton.css` sets no `display`, so the root is a
    // block `div`. An NSH view with no display utility keeps the column-flex
    // default, which would lay the caller's children out as flex items
    // (research 3.1: every root part declares its display).
    base: "block pointer-events-none relative overflow-hidden rounded-sm bg-surface-tertiary/70",
  },
  variants: {
    animationType: {
      // R-006 … R-010: `.skeleton--shimmer` has no class of its own. Its
      // `::after` is a real child `View` (R-006 / R-007), its start offset and
      // animation are inline style on that view (R-008 / R-009) and its
      // gradient is the view's class string (R-010); all of them are in
      // `skeleton.tsx`. The slot is empty here so `shimmer` is a valid value
      // of the dimension, matching HeroUI's table.
      shimmer: {},
      // R-018: `.skeleton--pulse` → `animate-pulse`, run natively by NSH with
      // the same keyframes Tailwind's `animate-pulse` uses.
      pulse: { base: "animate-pulse" },
      // R-019: `.skeleton--none` has no declarations; the slot is empty.
      none: {},
    },
  },
  defaultVariants: {
    animationType: "shimmer",
  },
});

/*
 * Deleted rules (port sheet §4, §5):
 *
 * R-011: `.skeleton--shimmer:has(.skeleton)::after { content: none }`.
 * R-012: `.skeleton--shimmer:has(.skeleton)::before { absolute inset-0
 *        -translate-x-full animate-skeleton content-[''] }`.
 * R-013: the parent shimmer's white `linear-gradient(...)`.
 * R-014: its `z-index: 10`.
 * R-015: its `pointer-events: none`.
 * R-016: its `mix-blend-mode: overlay`.
 * R-017: `.skeleton--shimmer:has(.skeleton) .skeleton::after { content: none }`.
 *
 * The whole `:has()` aggregate has no public API: it only fires when a caller
 * writes the internal BEM class on a parent `div` by hand, and NSH has neither
 * `:has()` nor a way for a child to register itself with a plain `View`.
 */

export type SkeletonVariants = VariantProps<typeof skeletonVariants>;
