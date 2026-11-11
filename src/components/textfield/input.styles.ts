import type { VariantProps } from "tailwind-variants";

import { tv } from "tailwind-variants";

import { ease, radius, shadow } from "../../tokens/geometry";

/**
 * Input's variant table, mirroring `@heroui/styles` 3.2.7
 * `packages/styles/src/components/input/input.styles.ts` expanded with the
 * declarations of `packages/styles/components/input.css`.
 *
 * HeroUI's table only produces BEM class names; every declaration lives in the
 * CSS file. NSH has no BEM CSS and no descendant selectors (D18), so the block
 * is expanded here into the declarations it applied. The state rules upstream
 * writes with `:hover`, `:focus`, `[data-invalid]` and `:disabled` cannot live
 * in a static slot: they are the `computed` class strings in
 * `text-control.tsx` (port sheet §4).
 */
export const inputVariants = tv({
  /*
   * R-005: `.input` → `@apply rounded-field border bg-field px-3 py-2 text-base
   * text-field-foreground shadow-field outline-none
   * placeholder:text-field-placeholder sm:text-sm`; both halves of
   * `shadow-field` come from `shadow.field` in `src/tokens/geometry.ts`.
   * R-006: `border-width: var(--border-width-field)` → `border-0`: the default
   * theme's field border width is 0, and NSH has no field border width token
   * (§8: a theme that changes it is not followed). `border` and this rule are
   * one owner, written as `border-0`.
   * R-008: the three `--input-bg*` custom properties are folded into their use
   * sites: this `bg-field`, `bg-field-hover` in R-012 and `bg-field-focus` in
   * R-013.
   * R-010: the transition property list is inline in `text-control.tsx`
   * (`transitionProperty`); `duration-150` and the smooth curve from
   * `src/tokens/geometry.ts` carry the timing here.
   * R-011: `@apply motion-reduce:transition-none`.
   */
  base: [
    `${radius.field} border-0 bg-field px-3 py-2 text-base text-field-foreground`,
    `${shadow.field.both} outline-none placeholder:text-field-placeholder sm:text-sm`,
    `duration-150 ${ease.smooth} motion-reduce:transition-none`,
  ].join(" "),
  defaultVariants: {
    fullWidth: false,
    variant: "primary",
  },
  variants: {
    // R-022: `.input--full-width` → `width: 100%`.
    fullWidth: {
      false: "",
      true: "w-full",
    },
    // R-017: `.input--primary` is an empty block.
    // R-018: `.input--secondary` → `@apply shadow-none` and `bg-default`, the
    // value its three custom properties carry. Its hover / focus / invalid
    // reassignments are R-019 / R-020 / R-021 in `text-control.tsx`.
    variant: {
      primary: "",
      secondary: "shadow-none bg-default",
    },
  },
  /*
   * Deleted rules:
   * R-007: `border-color: var(--field-border)` — the default theme's field
   * border is transparent and its width 0, so the declaration paints nothing.
   * R-009: `--input-autofill-shadow` — NSH draws no UA autofill layer.
   * R-016: the `:-webkit-autofill` family — UA pseudo-classes without a host
   * counterpart.
   */
});

export type InputVariants = VariantProps<typeof inputVariants>;
