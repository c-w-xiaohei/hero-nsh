import type { VariantProps } from "tailwind-variants";

import { tv } from "tailwind-variants";

/**
 * ColorSwatchPicker's variant table, mirroring `@heroui/styles` 3.2.7
 * `packages/styles/src/components/color-swatch-picker/color-swatch-picker.styles.ts`
 * and the CSS block `packages/styles/components/color-swatch-picker.css`.
 *
 * Upstream's table only names BEM blocks (`color-swatch-picker`,
 * `--grid/--stack`, `--xs … --xl`, `--circle/--square` and the four slots) and
 * the declarations live in the stylesheet; NSH has no BEM (D18), so each block's
 * declarations sit in the slot or compound below. The order is upstream's
 * cascade: the base, then the size blocks, then the shape blocks, then the
 * shape × size blocks (`.color-swatch-picker--square.color-swatch-picker--xs`
 * wins over both). Every rule of port sheet §4.1 is marked where it lands; the
 * ones realized as `classList` / inline style in a part are named there.
 */
export const colorSwatchPickerVariants = tv({
  slots: {
    /* R-001: `.color-swatch-picker` → `flex flex-wrap items-center gap-2`
       (8pt gap). NSH defaults a View to a column, so `flex` here is a row. */
    base: "flex flex-wrap items-center gap-2",
    /* R-002: `.color-swatch-picker__item` → `relative flex size-8
       items-center justify-center rounded-2xl border-2 border-transparent
       outline-none` (32pt box, 16pt radius, 2pt border; md is the default).
       R-004: `cursor: var(--cursor-interactive)` → `cursor-pointer`.
       R-005: the transition's 100ms `--ease-out` half; the property list is
       inline in the item part (NSH has no `transition-border`).
       R-007: `motion-reduce:transition-none`.
       R-003 (`-webkit-tap-highlight-color`) and R-006 (`transform-gpu`) are
       deleted: NSH has no web tap highlight and composes every transform alike. */
    item:
      "relative flex size-8 items-center justify-center rounded-2xl border-2 border-transparent outline-none cursor-pointer duration-100 ease-out motion-reduce:transition-none",
    /* R-013: `.color-swatch-picker__swatch` → `block size-full`.
       R-015: `transition: transform 100ms var(--ease-out)`.
       R-017: `motion-reduce:transition-none`.
       R-016 (`transform-gpu`) is deleted like R-006.
       R-014 (`border-radius: inherit`) has no NSH form: the swatch's radius is
       given per size / shape in the compounds below, so it equals the item's
       in every variant but does not follow a caller's custom radius (§8). */
    swatch:
      "block size-full transition-transform duration-100 ease-out motion-reduce:transition-none",
    /* R-019: `.color-swatch-picker__indicator` → `pointer-events-none absolute
       inset-0 z-10 flex items-center justify-center`. */
    indicator:
      "pointer-events-none absolute inset-0 z-10 flex items-center justify-center",
  },
  variants: {
    /* R-025: `.color-swatch-picker--grid` declares nothing — `flex flex-wrap`
       is already the wrapping row. R-026: `--stack` → `flex-col`. */
    layout: {
      grid: "",
      stack: "flex-col",
    },
    /* R-027 … R-031 / R-049 … R-053: the size blocks themselves carry no
       declarations of their own; their item rules are the compounds below. */
    size: {
      lg: "",
      md: "",
      sm: "",
      xl: "",
      xs: "",
    },
    /* R-032: `.color-swatch-picker--circle` declares nothing (the base radius
       is already the circle look). R-033 / R-034: `--square` → the item's
       `rounded-xl` and the swatch's `rounded-lg`. */
    variant: {
      circle: "",
      square: "",
    },
  },
  compoundVariants: [
    // R-027: `.color-swatch-picker--xs .item` → `size-4 rounded-lg border`
    // (16pt / 8pt / 1pt), with R-014's swatch radius (`rounded-lg`) alongside.
    { size: "xs", class: { item: "size-4 rounded-lg border", swatch: "rounded-lg" } },
    // R-028: `--sm` → `size-6 rounded-xl border-2` (24pt / 12pt / 2pt) and the
    // swatch's `rounded-2xl`.
    {
      size: "sm",
      class: { item: "size-6 rounded-xl border-2", swatch: "rounded-2xl" },
    },
    // R-029: `--md` declares nothing; the base item is already the md size.
    // R-014's md swatch radius is the one value it adds.
    { size: "md", class: { swatch: "rounded-2xl" } },
    // R-030: `--lg` → `size-9 rounded-3xl border-3` (36pt / 24pt / 3pt).
    {
      size: "lg",
      class: { item: "size-9 rounded-3xl border-3", swatch: "rounded-3xl" },
    },
    // R-031: `--xl` → `size-10 rounded-3xl border-3` (40pt / 24pt / 3pt).
    {
      size: "xl",
      class: { item: "size-10 rounded-3xl border-3", swatch: "rounded-3xl" },
    },
    // R-033 / R-034: the square shape replaces both radii (12pt / 8pt).
    { variant: "square", class: { item: "rounded-xl", swatch: "rounded-lg" } },
    // R-036 / R-037: `.color-swatch-picker--square.color-swatch-picker--xs` →
    // both parts `rounded-md` (6pt). R-038 is deleted: the selected rule adds
    // nothing to R-037.
    {
      variant: "square",
      size: "xs",
      class: { item: "rounded-md", swatch: "rounded-md" },
    },
    // R-039 / R-040: square + sm → both parts `rounded-lg` (8pt). R-041 is the
    // one place the selected state really shrinks the swatch (8 → 6pt); the
    // swatch part realizes it as a `classList`, because it is state, not a
    // variant, and only the swatch changes.
    {
      variant: "square",
      size: "sm",
      class: { item: "rounded-lg", swatch: "rounded-lg" },
    },
    // R-042: square + md declares nothing; the square block's radius is it.
    // R-043 / R-044: square + lg → item `rounded-xl`, swatch `rounded-lg`.
    // R-045 is deleted: selected adds nothing.
    {
      variant: "square",
      size: "lg",
      class: { item: "rounded-xl", swatch: "rounded-lg" },
    },
    // R-046 / R-047: square + xl → item `rounded-xl`, swatch `rounded-lg`.
    // R-048 is deleted: selected adds nothing.
    {
      variant: "square",
      size: "xl",
      class: { item: "rounded-xl", swatch: "rounded-lg" },
    },
  ],
  defaultVariants: {
    layout: "grid",
    size: "md",
    variant: "circle",
  },
});

export type ColorSwatchPickerVariants = VariantProps<
  typeof colorSwatchPickerVariants
>;
