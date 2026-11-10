import type { VariantProps } from "tailwind-variants";

import { tv } from "tailwind-variants";

/**
 * TimeField's variant table, mirroring `@heroui/styles` 3.2.7
 * `packages/styles/src/components/time-field/time-field.styles.ts` expanded with
 * the declarations of `packages/styles/components/time-field.css`.
 *
 * Upstream's table produces one BEM class (`time-field`) and one modifier
 * (`time-field--full-width`); the CSS block adds two descendant rules. NSH has
 * no BEM CSS and no descendant selectors (D18), so the block's declarations are
 * expanded here. The slot names and the single `fullWidth` dimension stay
 * exactly upstream's: `base` only, `false` by default.
 */
export const timeFieldVariants = tv({
  /*
   * R-001: `.time-field` → `@apply flex flex-col gap-1`.
   * R-003 is deleted: `.time-field [data-slot="label"] { @apply w-fit }` has no
   * channel here. The shipped `FieldState` carries only state and the label
   * registry, not the `partClass` that `DescriptionContext` has, so a field root
   * cannot make a Label shrink to its text; `w-fit` changes no visible pixel and
   * the gap is registered in §8. An additive, optional `FieldState.partClass`
   * would close it (port sheet §5, item 7).
   *
   * R-002 lives in the root: `.time-field[data-invalid] [data-slot="description"]`
   * → `display: none` becomes `DescriptionContext.partClass` returning
   * `"hidden"` while the field is invalid (no descendant selector, and the
   * Description keeps its accessibility text, which `display: none` would take
   * away upstream).
   */
  base: "flex flex-col gap-1",
  defaultVariants: {
    fullWidth: false,
  },
  variants: {
    // R-004: `.time-field--full-width` → `@apply w-full`.
    fullWidth: {
      false: "",
      true: "w-full",
    },
  },
});

export type TimeFieldVariants = VariantProps<typeof timeFieldVariants>;

export type TimeFieldSlots = ReturnType<typeof timeFieldVariants>;
