import type { VariantProps } from "tailwind-variants";

import { tv } from "tailwind-variants";

/**
 * Card's variant table, mirroring `@heroui/styles` 3.2.7
 * `packages/styles/src/components/card/card.styles.ts` plus the declarations of
 * `packages/styles/components/card.css`.
 *
 * Upstream the table only emits BEM block and element names and every
 * declaration lives in the stylesheet. NSH has no BEM CSS (D18), so each block
 * of `card.css` is expanded here into the declarations it applied, one `R-xxx`
 * per row of port sheet §4. The six slots keep upstream's names, and the only
 * dimension is `variant`, which changes `base` alone — the parts still resolve
 * their slot through the table so the shape stays isomorphic to upstream.
 */
export const cardVariants = tv({
  slots: {
    // R-001: `.card` → `@apply relative flex flex-col gap-3 overflow-visible
    // p-4` (gap 12, padding 16). `overflow-visible` matches NSH's default and
    // is written to correspond line by line.
    // R-002: `.card` → `@apply shadow-surface`. A shadow cannot switch with
    // the appearance, so the dark pair is written next to it (theme notes).
    // R-003: `.card` → `border-radius: min(32px, var(--radius-3xl))`. This
    // theme's `radius.3xl` is 24, so `min(32, 24)` is 24 and `rounded-3xl`
    // matches; a theme above 32 would exceed upstream's cap (port sheet §8).
    base: "relative flex flex-col gap-3 overflow-visible rounded-3xl p-4 shadow-surface dark:shadow-surface-dark",
    // R-004: `.card__header` → `@apply flex flex-col`.
    header: "flex flex-col",
    // R-005: `.card__title` → `@apply text-sm leading-6 font-medium
    // text-foreground` (14 / 24 / 500). The color, size, line height and
    // weight inherit from the title's view into its inner `Text` (twref "Text
    // styles inherit").
    title: "text-sm leading-6 font-medium text-foreground",
    // R-006: `.card__description` → `@apply text-sm leading-5 text-muted`
    // (14 / 20).
    description: "text-sm leading-5 text-muted",
    // R-007: `.card__content` → `@apply flex flex-1 flex-col gap-1` (gap 4).
    // `flex-auto` instead of `flex-1`: NSH stores `flex-1` as a zero *length*
    // basis, so a Card measured on the cross axis (a row with `items-start` /
    // `items-center`) sums its children's bases and the content contributes 0.
    // `flex-auto` keeps upstream's `1 1 0%` behaviour in every parent (skill
    // §2.5).
    content: "flex flex-auto flex-col gap-1",
    // R-008: `.card__footer` → `@apply flex flex-row items-center`.
    footer: "flex flex-row items-center",
  },
  variants: {
    variant: {
      // R-010: `.card--default` → `@apply bg-surface`.
      default: {
        base: "bg-surface",
      },
      // R-011: `.card--secondary` → `@apply bg-surface-secondary`.
      secondary: {
        base: "bg-surface-secondary",
      },
      // R-012: `.card--tertiary` → `@apply bg-surface-tertiary`.
      tertiary: {
        base: "bg-surface-tertiary",
      },
      // R-009: `.card--transparent` → `@apply border-none bg-transparent
      // shadow-none`. `dark:shadow-none` is required: the base's
      // `dark:shadow-surface-dark` belongs to another variant group, so an
      // unprefixed `shadow-none` would not merge it away and the dark
      // appearance would keep drawing the inner shadow. `border-none` is a
      // no-op while the base declares no border, kept for line-by-line
      // correspondence.
      transparent: {
        base: "border-none bg-transparent shadow-none dark:shadow-none",
      },
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

export type CardVariants = VariantProps<typeof cardVariants>;
