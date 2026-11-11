import type { VariantProps } from "tailwind-variants";

import { tv } from "tailwind-variants";

/**
 * ComboBox's variant table, mirroring `@heroui/styles` 3.2.7
 * `packages/styles/src/components/combo-box/combo-box.styles.ts` and the
 * declarations of `packages/styles/components/combo-box.css` (port sheet §4,
 * R-001 … R-040; D18 drops the BEM class names, so each slot carries the
 * declarations its block applied).
 *
 * One dimension, as upstream: `fullWidth`. `variant` is a root prop in HeroUI
 * 3.2.7 that neither the variant table nor the CSS branches on, so it produces
 * no classes here either (port sheet §1).
 */
export const comboBoxVariants = tv({
  slots: {
    // R-001: `.combo-box` → `flex flex-col gap-1`. R-003 (`w-fit` on the label)
    // is deleted: NSH's text sizes to its content.
    // R-039: `.combo-box--full-width` → `w-full`, on the `fullWidth` dimension.
    base: "flex flex-col gap-1",
    // R-009: `.combo-box__input-group` → `relative flex items-center`.
    // `isolate` and `inline-flex` have no counterpart (NSH lays out blocks).
    // R-040: `.combo-box__input-group--full-width` → `w-full`.
    inputGroup: "relative flex items-center",
    // R-010: `.combo-box__value` → `text-sm text-field-foreground`.
    // `wrap-break-word` is dropped: NSH has no such class and no
    // `overflowWrap` style key (port sheet §8).
    value: "text-sm text-field-foreground",
    // R-014: `.combo-box__trigger` → pinned to the inline end of the input
    // group, full height, centred, coloured like the placeholder. The upstream
    // reset of the button defaults (`border-none bg-transparent outline-none`)
    // rides along; `no-highlight` (Web tap highlight) has no counterpart.
    // R-015: `@media (hover: hover) { &:hover }` → the native hover variant;
    // the trigger has no child whose hover must be excluded.
    trigger:
      "absolute end-0 top-1/2 flex h-full shrink-0 -translate-y-1/2 cursor-pointer items-center justify-center pe-2 text-field-placeholder transition duration-150 border-none bg-transparent outline-none hover:text-field-foreground",
    // R-019: `.combo-box__trigger [data-slot="combo-box-trigger-default-icon"]`
    // → the built-in chevron's own box. A caller's indicator never gets it.
    triggerIcon: "size-4 transition-transform duration-150 motion-reduce:transition-none",
    // R-021: `.combo-box__popover` → the 22pt overlay card. `radius-2xl` (16) +
    // `spacing` (4) × 1.5 = 22 in this theme, so the 32pt min() cap never
    // applies. The scroll classes (`overflow-y-auto`, `scroll-py-1`, `overscroll-
    // contain`, `scrollbar`) are not Tailwind here: the component wraps the list
    // in `Scroll` and `overflow-hidden` clips the corners.
    // R-023 / R-028: the duration and curve of the enter and exit transitions
    // (the property list and the shorter exit duration are inline).
    // R-022: the popover is not a focus stop (the input keeps the focus), so
    // upstream's `outline-none` is only a fallback here.
    popover: [
      "flex flex-col overflow-hidden bg-overlay p-0 text-sm rounded-[22px] shadow-overlay dark:shadow-overlay-dark outline-none",
      "duration-150 ease-smooth",
    ].join(" "),
  },
  defaultVariants: {
    fullWidth: false,
  },
  variants: {
    fullWidth: {
      false: {},
      // R-039, R-040.
      true: {
        base: "w-full",
        inputGroup: "w-full",
      },
    },
  },
});

export type ComboBoxVariants = VariantProps<typeof comboBoxVariants>;
