import type { VariantProps } from "tailwind-variants";
import { tv } from "tailwind-variants";

/**
 * HeroUI 3.2.7's `colorFieldVariants`
 * (`packages/styles/src/components/color-field/color-field.styles.ts`): one
 * dimension, `fullWidth`. Upstream emits BEM modifiers (`color-field`,
 * `color-field--full-width`); NSH has no BEM stylesheet (D18), so the modifier
 * carries its declarations instead (port sheet §4, R-001 and R-004).
 */
export const colorFieldVariants = tv({
  // R-001: `.color-field { @apply flex flex-col gap-1 }`.
  base: "flex flex-col gap-1",
  defaultVariants: {
    fullWidth: false,
  },
  variants: {
    fullWidth: {
      false: "",
      // R-004: `.color-field--full-width { @apply w-full }`.
      true: "w-full",
    },
  },
});

export type ColorFieldVariants = VariantProps<typeof colorFieldVariants>;
