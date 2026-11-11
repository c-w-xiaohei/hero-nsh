import type { VariantProps } from "tailwind-variants";

import { tv } from "tailwind-variants";

import { ease, radius, shadow } from "../../tokens/geometry";

/**
 * ColorInputGroup's variant table, mirroring `@heroui/styles` 3.2.7
 * `packages/styles/src/components/color-input-group/color-input-group.styles.ts`
 * plus the declarations of `packages/styles/components/color-input-group.css`.
 *
 * HeroUI's table only produces BEM class names (`color-input-group`,
 * `color-input-group__input`, `color-input-group--primary` …) and every
 * declaration lives in the CSS file. NSH has no BEM CSS and no descendant
 * selectors (D18), so the blocks are expanded here into the declarations they
 * applied. State rules that upstream writes with `:hover`, `:focus-within`,
 * `[data-invalid]` and `[data-disabled]` cannot live in a static slot: they are
 * `classList` entries in `color-input-group-root.tsx` (port sheet §4).
 *
 * The slot names and the two variant dimensions stay exactly upstream's:
 * `base` / `input` / `prefix` / `suffix`, `fullWidth` and `variant`.
 */
export const colorInputGroupVariants = tv({
  defaultVariants: {
    fullWidth: false,
    variant: "primary",
  },
  slots: {
    /*
     * R-001: `.color-input-group` → `inline-flex h-9 items-center
     * overflow-hidden rounded-field border bg-field text-sm
     * text-field-foreground shadow-field outline-none`. `inline-flex` has no
     * inline layout context in NSH, so the root states the row itself
     * (`flex-row`) and keeps `inline-flex` for line-for-line parity; the
     * shrink-to-content inline box is the caller's layout concern.
     * R-002: `border-width: var(--border-width-field)` → `border-0`: the
     * default theme's field border width is 0, and NSH has no field border
     * width token (§8: a theme that changes it is not followed).
     * R-003 is deleted: `border-color: var(--field-border)` is
     * `transparent` in the default theme and the width is 0, so it paints
     * nothing (the same disposition as TextField's R-007).
     * R-004: `--color-input-group-bg: var(--color-field)` → the default
     * `bg-field` below; the secondary variant restates it as `bg-default`.
     * R-005: `--color-input-group-bg-hover: var(--color-field-hover)` → the
     * `bg-field-hover` classList entry in the root (R-009); secondary uses
     * `bg-default-hover` (R-029).
     * R-006: `--color-input-group-bg-focus: var(--field-focus)` → primary
     * focus keeps the default fill (`field-focus` equals `field`); secondary
     * focus is `bg-default` (R-030) and invalid is `bg-field-focus` (R-012).
     * R-007: `transition: background-color 150ms var(--ease-smooth),
     * border-color 150ms var(--ease-smooth), box-shadow 150ms
     * var(--ease-out)` → one NSH transition, `duration-150 ease-smooth`;
     * NSH cannot give each property its own curve, and the shadow's
     * `ease-out` is registered in §8.
     * R-008: `@apply motion-reduce:transition-none` →
     * `motion-reduce:transition-none`.
     */
    base: `inline-flex flex-row h-9 items-center overflow-hidden ${radius.field} border-0 bg-field text-sm text-field-foreground ${shadow.field.both} outline-none transition duration-150 ${ease.smooth} motion-reduce:transition-none`,
    /*
     * R-015: `.color-input-group__input` → `flex h-full flex-1 cursor-text
     * items-center rounded-none border-0 bg-transparent px-3 py-2 text-base
     * shadow-none outline-none sm:text-sm`. `flex` / `items-center` only
     * affect layout on a native input; the class string stays upstream's.
     * R-016: `.color-input-group__input::placeholder` → `text-field-placeholder`
     * becomes `placeholder:text-field-placeholder`, NSH's placeholder color.
     * R-019 is deleted: `:focus` / `:focus-visible` → `outline-none` is
     * already in the base string, and the input has no other outline source.
     * R-020 is deleted: the `:-webkit-autofill` / `:autofill` block covers
     * the browser's UA fill layer with a 1000px inset shadow; NSH inputs are
     * drawn by the platform and have no such layer (§8, web-only).
     * R-034 is deleted: `.color-input-group--secondary
     * [data-slot="color-input-group-input"] { @apply bg-transparent }` is
     * already in this string.
     *
     * `min-w-40` has no upstream class: a browser `<input>` has a default
     * intrinsic width (its `size` of 20 characters, about 160pt at `sm` text),
     * so HeroUI's shrink-wrapped group is about that wide; an NSH native input
     * has no intrinsic width and `flex-1`'s zero basis would collapse the group
     * to its 24pt padding. The minimum restates the browser's natural size, and
     * `flex-1` still lets the input grow (§8).
     */
    input:
      "flex h-full flex-1 min-w-40 cursor-text items-center rounded-none border-0 bg-transparent px-3 py-2 text-base shadow-none outline-none placeholder:text-field-placeholder sm:text-sm",
    /*
     * R-021: `.color-input-group__prefix` → `shrink-0
     * text-field-placeholder`.
     * R-022: `.color-input-group__prefix` → `ms-3 me-0 flex items-center`
     * (the `me-0` is the default and stays for parity).
     */
    prefix: "shrink-0 text-field-placeholder ms-3 me-0 flex items-center",
    /*
     * R-023: `.color-input-group__suffix` → `shrink-0
     * text-field-placeholder`.
     * R-024: `.color-input-group__suffix` → `me-3 flex items-center`.
     */
    suffix: "shrink-0 text-field-placeholder me-3 flex items-center",
  },
  variants: {
    // R-035: `.color-input-group--full-width` → `@apply w-full`.
    fullWidth: {
      false: {},
      true: {
        base: "w-full",
      },
    },
    // R-025: `.color-input-group--primary` is an empty block; primary is the
    // default, so the entry stays empty to keep the table's shape upstream's.
    // R-026: `.color-input-group--secondary` → `@apply shadow-none`, with
    // `dark:shadow-none` covering the base's `dark:shadow-field-dark` (itself
    // a transparent inset, so the look is unchanged).
    // R-027: secondary's `background-color: var(--color-input-group-bg)` is
    // `--default` → `bg-default`.
    // R-028: secondary reassigns the three fill tokens to `--default` /
    // `--default-hover` / `--default`; the hover and focus classes that read
    // them are `bg-default-hover` (R-029) and `bg-default` (R-030 / R-033).
    // R-013 / R-032 are deleted: `border-color:
    // var(--color-field-border-invalid)` names a variable the upstream styles
    // never define, so the declaration never applies; the border width is 0
    // anyway. No `border-danger` is invented.
    variant: {
      primary: {},
      secondary: {
        base: "shadow-none dark:shadow-none bg-default",
      },
    },
  },
});

export type ColorInputGroupVariants = VariantProps<typeof colorInputGroupVariants>;
