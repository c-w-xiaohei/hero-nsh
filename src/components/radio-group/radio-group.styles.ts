import type { VariantProps } from "tailwind-variants";

import { tv } from "tailwind-variants";

/**
 * RadioGroup's variant table, mirroring `@heroui/styles` 3.2.7
 * `packages/styles/src/components/radio-group/radio-group.styles.ts` plus the
 * declarations of `packages/styles/components/radio-group.css`.
 *
 * Two dimensions live here: `variant` and `orientation`. Neither one draws the
 * group itself beyond its layout: every rule of `radio-group.css` that carries
 * pixels (R-002, R-005—R-008) is a descendant rule on the items, so the group
 * passes the dimension down through `RadioGroupContext` and the classes live on
 * `Radio.Root`, `Radio.Control` and `Radio.Indicator` (radio port sheet
 * R-026 / R-029—R-032). BEM names are not emitted (D18).
 */
export const radioGroupVariants = tv({
  // R-001: `.radio-group` → `@apply flex flex-col`.
  base: "flex flex-col",
  variants: {
    // R-003: `&[data-orientation="horizontal"]` → `flex-row flex-wrap gap-4`;
    // the vertical case stays the base column.
    // R-002: `&[data-orientation="vertical"] [data-slot="radio"] { mt-4 }` has
    // no descendant selector here: the group hands `mt-4` to every item root
    // through its context instead, the first item included.
    orientation: {
      vertical: "",
      horizontal: "flex-row flex-wrap gap-4",
    },
    variant: {
      // R-004: `.radio-group--primary` is an empty block, so the dimension's
      // default value is all it contributes.
      // R-005—R-008: `.radio-group--secondary` only re-tints the items'
      // Control and dot, which the variant carried through the context does on
      // the item side; the group writes no class for either value.
      primary: "",
      secondary: "",
    },
  },
  defaultVariants: {
    variant: "primary",
    orientation: "vertical",
  },
});

export type RadioGroupVariants = VariantProps<typeof radioGroupVariants>;

export type RadioGroupVariant = NonNullable<RadioGroupVariants["variant"]>;

export type RadioGroupOrientation = NonNullable<RadioGroupVariants["orientation"]>;
