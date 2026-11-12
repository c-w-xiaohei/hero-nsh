import type { VariantProps } from "tailwind-variants";

import { tv } from "tailwind-variants";

import { ease } from "../../tokens/geometry";

/**
 * The three ListBox variant tables of `@heroui/styles` 3.2.7
 * (`packages/styles/src/components/{list-box,list-box-item,list-box-section}/
 * *.styles.ts`), expanded to the declarations their BEM blocks apply
 * (D18: BEM class names are not carried over; the port sheet section 4 lists
 * each rule).
 */
export const listboxVariants = tv({
  // R-001: `.list-box` → `relative w-full overflow-clip p-1`; `overflow-clip`
  // is `overflow: hidden` in NSH, and `no-highlight` has no counterpart.
  // R-002: `.list-box > * + *` → `space-y-1` (NSH adds a bottom margin to
  // every child but the last; no margin collapsing, same spacing).
  // R-003: the horizontal Separator's `ms-[3%] w-[94%]` is deleted here: NSH
  // has no descendant selectors, and the indent belongs to the Separator unit
  // (port sheet section 5); scenarios draw the line with a local View.
  base: "relative w-full overflow-hidden p-1 space-y-1",
  defaultVariants: {
    variant: "default",
  },
  variants: {
    // R-021: `.list-box-item--default` has no declarations; the dimension is
    // kept with no class of its own.
    // R-024: `.list-box-item--danger` only carries the two child rules that
    // R-022 / R-023 realize through context.
    // Root's `variant` is a BEM marker upstream (`list-box.css` has no
    // `--default` / `--danger` block), so both values stay empty here.
    variant: {
      default: "",
      danger: "",
    },
  },
});

export type ListBoxVariants = VariantProps<typeof listboxVariants>;

export const listboxItemVariants = tv({
  slots: {
    // R-004: `.list-box-item` → the row box, with `select-none` replacing the
    // two `[data-slot]` descendant rules (R-008 / R-009).
    // R-005: transform 250ms `--ease-out-quart` + box-shadow 150ms
    // `--ease-out`; NSH has one duration and one curve, so both are 250ms
    // out-quart (registered in port sheet section 8).
    // R-006: `cursor: var(--cursor-interactive)` → `cursor-pointer`.
    // R-014: hover background (`hover:` is pointer-only in NSH, so the upstream
    // `@media (hover: hover)` wrapper has no counterpart).
    // R-008 / R-009: `w-fit`, `text-wrap` and `select-none` on the Label /
    // Description slots are realized by the row's `select-none` (R-004), the
    // Text component's own content sizing and Description's `text-wrap`.
    // R-012: `.list-box-item:focus` is an empty block; nothing to translate.
    // R-015: the selected blocks are empty too: selection has no background,
    // only the indicator (R-019 / R-020) shows it.
    item: [
      "relative flex min-h-9 w-full items-center justify-start gap-3 rounded-2xl px-2 py-1.5 text-foreground outline-none select-none",
      `transition duration-[250ms] ${ease.outQuart} motion-reduce:transition-none cursor-pointer`,
      "hover:bg-default",
    ].join(" "),
    // R-017: the indicator slot, pinned to the inline end and vertically
    // centered.
    // R-018: its 250ms transition.
    indicator: [
      "absolute end-2 inset-y-0 flex w-4 shrink-0 items-center justify-center text-default-foreground",
      "transition duration-[250ms] motion-reduce:transition-none",
    ].join(" "),
  },
  defaultVariants: {
    variant: "default",
  },
  variants: {
    variant: {
      // R-021: no declarations; the item's danger look comes from R-022 /
      // R-023 through the item context.
      default: { item: "" },
      danger: { item: "" },
    },
  },
});

export type ListBoxItemVariants = VariantProps<typeof listboxItemVariants>;

export const listboxSectionVariants = tv({
  // R-025: `.list-box-section` → `flex flex-col items-start gap-0`.
  base: "flex flex-col items-start gap-0",
});

export type ListBoxSectionVariants = VariantProps<typeof listboxSectionVariants>;
