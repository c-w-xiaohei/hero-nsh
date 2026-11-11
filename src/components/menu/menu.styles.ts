import type { VariantProps } from "tailwind-variants";

import { tv } from "tailwind-variants";

import { ease } from "../../tokens/geometry";

/**
 * The three Menu variant tables of `@heroui/styles` 3.2.7
 * (`packages/styles/src/components/{menu,menu-item,menu-section}/*.styles.ts`),
 * expanded to the declarations their BEM blocks apply (D18: BEM class names are
 * not carried over; the port sheet section 4 lists each rule).
 */
export const menuVariants = tv({
  // R-001: `.menu` → `relative flex w-full flex-col gap-1 overflow-clip p-1`;
  // `overflow-clip` is `overflow: hidden` in NSH, and `no-highlight` (the web
  // tap highlight) has no counterpart.
  base: "relative flex w-full flex-col gap-1 overflow-hidden p-1",
});

export type MenuVariants = VariantProps<typeof menuVariants>;

export const menuItemVariants = tv({
  slots: {
    // R-003: `.menu-item` → the row box; `select-none` once on the row replaces
    // the two `[data-slot]` descendant rules (R-007 / R-008).
    // R-004: transform 250ms `--ease-out-quart` plus box-shadow 150ms
    // `--ease-out`; NSH has one duration and one curve, so both become 250ms
    // out-quart (registered in port sheet section 8).
    // R-005: `cursor: var(--cursor-interactive)` → `cursor-pointer`.
    // R-015: hover background (`hover:` is pointer-only in NSH, so upstream's
    // `@media (hover: hover)` wrapper has no counterpart).
    item: [
      "relative flex min-h-9 w-full items-center justify-start gap-3 rounded-2xl px-2 py-1.5 outline-none select-none",
      `transition duration-[250ms] ${ease.outQuart} motion-reduce:transition-none cursor-pointer`,
      "hover:bg-default",
    ].join(" "),
    // R-019: the indicator slot, pinned to `start-2` and vertically centered.
    // R-020: its 250ms transition (upstream's `duration-250` is not a standard
    // step, so it is written as an arbitrary value).
    indicator: [
      "absolute start-2 top-1/2 flex size-4 shrink-0 -translate-y-1/2 items-center justify-center text-muted",
      "transition duration-[250ms] motion-reduce:transition-none",
    ].join(" "),
    // R-023: the submenu slot keeps `text-muted`.
    // R-024: it is mounted only while `hasSubmenu` is true, so it writes
    // `end-2` directly and never adds `start-2` (the net effect of
    // `start-auto end-2`). The remaining slot classes are the `.menu-item__indicator`
    // ones it also carries upstream (R-019 / R-020).
    submenuIndicator: [
      "absolute end-2 top-1/2 flex size-4 shrink-0 -translate-y-1/2 items-center justify-center text-muted",
      "transition duration-[250ms] motion-reduce:transition-none",
    ].join(" "),
  },
  defaultVariants: {
    variant: "default",
  },
  variants: {
    variant: {
      // R-026: `.menu-item--default` has no declarations; the dimension stays
      // with no class of its own.
      default: { item: "" },
      // The danger look reaches the indicator and the Label through the item
      // context (R-027 / R-028), not through a class on the row.
      danger: { item: "" },
    },
  },
});

export type MenuItemVariants = VariantProps<typeof menuItemVariants>;

export const menuSectionVariants = tv({
  // R-029: `.menu-section` → `flex flex-col items-start gap-0`.
  base: "flex flex-col items-start gap-0",
});

export type MenuSectionVariants = VariantProps<typeof menuSectionVariants>;
