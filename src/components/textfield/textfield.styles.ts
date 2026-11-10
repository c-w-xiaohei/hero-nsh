import type { VariantProps } from "tailwind-variants";

import { tv } from "tailwind-variants";

/**
 * TextField's variant table, mirroring `@heroui/styles` 3.2.7
 * `packages/styles/src/components/textfield/textfield.styles.ts` expanded with
 * `packages/styles/components/textfield.css`.
 *
 * The table has HeroUI's one dimension, `fullWidth`; `variant` is not a root
 * dimension upstream either (it travels through `TextFieldContext` to the
 * inputs, port sheet §1.2).
 */
export const textFieldVariants = tv({
  // R-001: `.textfield` → `@apply flex flex-col gap-1`.
  base: "flex flex-col gap-1",
  defaultVariants: {
    fullWidth: false,
  },
  variants: {
    // R-003: `.textfield--full-width` → `width: 100%`.
    fullWidth: {
      false: "",
      true: "w-full",
    },
  },
});

export type TextFieldVariants = VariantProps<typeof textFieldVariants>;
