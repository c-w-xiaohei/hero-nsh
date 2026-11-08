import type { VariantProps } from "tailwind-variants";

import { tv } from "tailwind-variants";

/**
 * Label's variant table, mirroring `@heroui/styles` 3.2.7
 * `packages/styles/src/components/label/label.styles.ts`.
 *
 * Only the variant surface is carried over: HeroUI's BEM class names
 * (`label`, `label--required`, …) have no CSS in NSH (D18), so each modifier
 * is expanded to the declarations its block applies.
 */
export const labelVariants = tv({
  // R-001: `.label` → `text-sm font-medium text-foreground`.
  base: "text-sm font-medium text-foreground",
  defaultVariants: {
    isDisabled: false,
    isInvalid: false,
    isRequired: false,
  },
  variants: {
    // R-002: `.label--required` draws an asterisk with `::after`; NSH has no
    // pseudo-elements, so the star is a nested `Text` in `label.tsx` and the
    // variant keeps HeroUI's dimension with no class of its own.
    isRequired: {
      true: "",
    },
    // R-005: `.label--disabled` → `@apply status-disabled` (opacity 0.5,
    // cursor not-allowed, pointer-events none); the theme has no such
    // variables, so they are literals (common rules, theme notes).
    isDisabled: {
      true: "opacity-50 cursor-not-allowed pointer-events-none",
    },
    // R-007: `.label--invalid` → `@apply text-danger`; the semantic color
    // follows the appearance by itself.
    isInvalid: {
      true: "text-danger",
    },
  },
});

export type LabelVariants = VariantProps<typeof labelVariants>;
