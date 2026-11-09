import type { VariantProps } from "tailwind-variants";

import { tv } from "tailwind-variants";

/**
 * Surface's variant table, mirroring `@heroui/styles` 3.2.7
 * `packages/styles/src/components/surface/surface.styles.ts` plus the
 * declarations of `packages/styles/components/surface.css`.
 *
 * HeroUI's table has one dimension (`variant`) and no slots: the BEM block is
 * the whole component. BEM class names are not carried over (D18), so each
 * block and modifier is expanded to the declarations it applies. Every value
 * here is a theme token, so the light and dark appearances switch by
 * themselves; no `dark:` variant is needed.
 */
export const surfaceVariants = tv({
  // R-001: `.surface` → `@apply relative text-foreground`
  // (`position: relative`, `color: var(--color-foreground)`). Text utilities
  // on a view inherit to the `Text` elements inside it (twref "Text styles
  // inherit"), which is CSS's `color` inheritance.
  base: "relative text-foreground",
  defaultVariants: {
    variant: "default",
  },
  variants: {
    variant: {
      // R-003: `.surface--default` → `@apply bg-surface
      // text-surface-foreground`.
      default: "bg-surface text-surface-foreground",
      // R-004: `.surface--secondary` → `@apply bg-surface-secondary
      // text-surface-secondary-foreground`.
      secondary: "bg-surface-secondary text-surface-secondary-foreground",
      // R-005: `.surface--tertiary` → `@apply bg-surface-tertiary
      // text-surface-tertiary-foreground`.
      tertiary: "bg-surface-tertiary text-surface-tertiary-foreground",
      // R-002: `.surface--transparent` → `@apply bg-transparent`; it sets no
      // text color, so the base's `text-foreground` stays.
      transparent: "bg-transparent",
    },
  },
});

export type SurfaceVariants = VariantProps<typeof surfaceVariants>;
