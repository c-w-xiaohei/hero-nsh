import type { VariantProps } from "tailwind-variants";

import { tv } from "tailwind-variants";

/**
 * DateField's variant table, mirroring `@heroui/styles` 3.2.7
 * `packages/styles/src/components/date-field/date-field.styles.ts` expanded
 * with the declarations of `packages/styles/components/date-field.css`.
 *
 * Upstream's table produces one BEM class (`date-field`) and one modifier
 * (`date-field--full-width`); the CSS block adds two descendant rules. NSH has
 * no BEM CSS and no descendant selectors (D18), so the block's declarations are
 * expanded here. The slot names and the single `fullWidth` dimension stay
 * exactly upstream's: `base` only, `false` by default.
 */
export const dateFieldVariants = tv({
  /*
   * R-001: `.date-field` → `@apply flex flex-col gap-1`.
   *
   * R-002 lives in the root: `.date-field[data-invalid="true"]
   * [data-slot="description"]` (and the `aria-invalid` twin) → `display: none`
   * becomes `DescriptionContext.partClass` returning `"hidden"` while the field
   * is invalid (no descendant selector, and the Description keeps its
   * accessibility text, which `display: none` would take away upstream).
   *
   * R-003 lives in the root too: `.date-field [data-slot="label"]`
   * → `@apply w-fit` becomes `FieldContext.partClass`, the channel the shipped
   * `FieldState` already carries and Label already reads.
   */
  base: "flex flex-col gap-1",
  defaultVariants: {
    fullWidth: false,
  },
  variants: {
    // R-004: `.date-field--full-width` → `@apply w-full`.
    fullWidth: {
      false: "",
      true: "w-full",
    },
  },
});

export type DateFieldVariants = VariantProps<typeof dateFieldVariants>;

export type DateFieldSlots = ReturnType<typeof dateFieldVariants>;
