import type { VariantProps } from "tailwind-variants";

import { tv } from "tailwind-variants";

import { ease, radius, shadow } from "../../tokens/geometry";

/**
 * TextArea's variant table, mirroring `@heroui/styles` 3.2.7
 * `packages/styles/src/components/textarea/textarea.styles.ts` expanded with
 * the declarations of `packages/styles/components/textarea.css`.
 *
 * The block repeats `.input`'s declarations plus `min-height: 38px`; its state
 * rules live in `text-control.tsx` as `computed` class strings (port sheet §4).
 */
export const textAreaVariants = tv({
  /*
   * R-023: `.textarea` → `@apply rounded-field border bg-field px-3 py-2
   * text-base text-field-foreground shadow-field outline-none
   * placeholder:text-field-placeholder sm:text-sm`; both halves of
   * `shadow-field` come from `shadow.field` in `src/tokens/geometry.ts`.
   * R-024: `min-height: 38px` → `min-h-[38px]`.
   * R-025: `border-width: var(--border-width-field)` → `border-0` (the default
   * theme's field border width is 0; §8 registers it).
   * R-027: the three `--textarea-bg*` custom properties are folded into their
   * use sites: this `bg-field`, `bg-field-hover` in R-031 and `bg-field-focus`
   * in R-032.
   * R-029: the transition property list is inline in `text-control.tsx`
   * (`transitionProperty`); `duration-150` and the smooth curve from
   * `src/tokens/geometry.ts` carry the timing here.
   * R-030: `@apply motion-reduce:transition-none`.
   */
  base: [
    `${radius.field} border-0 bg-field px-3 py-2 text-base text-field-foreground`,
    `${shadow.field.both} outline-none placeholder:text-field-placeholder sm:text-sm`,
    `min-h-[38px] duration-150 ${ease.smooth} motion-reduce:transition-none`,
  ].join(" "),
  defaultVariants: {
    fullWidth: false,
    variant: "primary",
  },
  variants: {
    // R-041: `.textarea--full-width` → `width: 100%`.
    fullWidth: {
      false: "",
      true: "w-full",
    },
    // R-036: `.textarea--primary` is an empty block.
    // R-037: `.textarea--secondary` → `@apply shadow-none` and `bg-default`,
    // the value its three custom properties carry. Its hover / focus / invalid
    // reassignments are R-038 / R-039 / R-040 in `text-control.tsx`.
    variant: {
      primary: "",
      secondary: "shadow-none bg-default",
    },
  },
  /*
   * Deleted rules:
   * R-026: `border-color: var(--field-border)` — transparent and 0 wide.
   * R-028: `--textarea-autofill-shadow` — NSH draws no UA autofill layer.
   * R-035: the `:-webkit-autofill` family — UA pseudo-classes without a host
   * counterpart.
   */
});

export type TextAreaVariants = VariantProps<typeof textAreaVariants>;
