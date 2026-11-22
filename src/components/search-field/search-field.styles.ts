import type { VariantProps } from "tailwind-variants";

import { tv } from "tailwind-variants";

// `radius.field`, `shadow.field.both` and `ease.smooth` of
// `src/tokens/geometry.ts` written out: the M2 class walker imports this file
// through Node ESM, which does not resolve extensionless relative specifiers,
// so the geometry module cannot be imported from a `.styles.ts`. Same pattern
// as `switch.styles.ts` / `date-picker.styles.ts`; keep in sync with
// `SHADOW_VALUES.field`, `EASE_VALUES.smooth` and `radius.field`.
const RADIUS_FIELD = "rounded-(--radius-field)";
const SHADOW_FIELD_BOTH =
  "shadow-[0_2px_4px_0_rgba(0,0,0,0.04),0_1px_2px_0_rgba(0,0,0,0.06),0_0_1px_0_rgba(0,0,0,0.06)] dark:shadow-[0_0_0_0_transparent_inset]";
const EASE_SMOOTH = "ease-[cubic-bezier(0.25,0.1,0.25,1)]";

/*
 * SearchField's variant table, mirroring `@heroui/styles` 3.2.7
 * `packages/styles/src/components/search-field/search-field.styles.ts` plus the
 * declarations of `packages/styles/components/search-field.css`.
 *
 * HeroUI's table only produces BEM class names (`search-field`,
 * `search-field__group`, `search-field--secondary` …) and every declaration
 * lives in the CSS file. NSH has no BEM CSS and no descendant or `:has()`
 * selectors (D18), so each block is expanded here into the declarations it
 * applied. State rules that upstream writes with `:hover`, `:focus-within`,
 * `[data-invalid]`, `[data-disabled]` and `[data-empty]` cannot live in a static
 * slot: they are `classList` entries of the root / group / clear button (port
 * sheet §4). The two `:has()` padding rules become part registrations
 * (R-017 / R-018).
 *
 * The slot names and the two variant dimensions stay exactly upstream's:
 * `base` / `group` / `input` / `searchIcon` / `clearButton`, `fullWidth` and
 * `variant`.
 */
export const searchFieldVariants = tv({
  slots: {
    // R-001: `.search-field` → `@apply flex flex-col gap-1`.
    // R-002 is a context rule, written in `search-field-root.tsx` (the
    // Description is hidden through `DescriptionContext.partClass`).
    // R-003 is deleted: `.search-field [data-slot="label"] { @apply w-fit }`
    // has no visible effect in NSH — a `Text` takes its content width, and the
    // column layout never stretches it (the same ruling as Select R-003).
    base: "flex flex-col gap-1",
    /*
     * R-005: `.search-field__group` → `relative inline-flex h-9 items-center
     * overflow-hidden rounded-field border bg-field text-sm text-field-foreground
     * shadow-field outline-none`. `inline-flex` has no inline layout context in
     * NSH, so the row is stated explicitly (`flex-row`); the shrink-to-content
     * inline box is the caller's layout concern, as in the other group
     * components.
     * R-006: `border-width: var(--border-width-field)` → `border-0`, the
     * default theme's field border width. A theme that changes it is not
     * followed (§8).
     * R-007 is deleted: `border-color: var(--field-border)` is `transparent` in
     * the default theme and the width is 0, so it paints nothing.
     * R-008: the three `--search-field-group-bg*` custom properties are folded
     * into their consumers: `bg-field` here, `bg-field-hover` in the root's
     * classList (R-011), `bg-field-focus` for an invalid primary group (R-013).
     * R-009: `transition: background-color 150ms var(--ease-smooth),
     * border-color 150ms var(--ease-smooth), box-shadow 150ms var(--ease-out)`
     * → one NSH transition, `duration-150` and the smooth curve; NSH gives an
     * element one duration and one curve, and the shadow's `ease-out` is
     * registered in §8. The shadow's two halves come from `shadow.field` in
     * `src/tokens/geometry.ts`.
     * R-010: `@apply motion-reduce:transition-none` →
     * `motion-reduce:transition-none`.
     */
    group:
      `relative inline-flex flex-row h-9 items-center overflow-hidden ${RADIUS_FIELD} border-0 bg-field text-sm text-field-foreground ${SHADOW_FIELD_BOTH} outline-none transition duration-150 ${EASE_SMOOTH} motion-reduce:transition-none`,
    /*
     * R-015: `.search-field__input` → `flex-1 rounded-none border-0
     * bg-transparent px-3 py-2 text-base shadow-none outline-none sm:text-sm`.
     * R-016 is deleted: `::-webkit-search-cancel-button` /
     * `::-webkit-search-decoration` have no NSH counterpart — there is no
     * `type="search"` and the native input draws no cancel button (§8).
     * R-017 / R-018 are part registrations, written in the group and read by the
     * input (the `:has()` padding rules).
     * R-019 is deleted: `:focus` / `:focus-visible` → `outline-none` is already
     * in this string, and the input has no second outline source.
     * R-020 is deleted: the `:-webkit-autofill` block covers the browser's UA
     * fill layer; NSH inputs are drawn by the platform and have no such layer
     * (§8, web-only).
     * R-032 is deleted: `.search-field--secondary
     * [data-slot="search-field-input"]` → `bg-transparent` is already here.
     *
     * `min-w-40` has no upstream declaration: a browser `<input>` has a default
     * intrinsic width (its `size` of 20 characters), so HeroUI's shrink-wrapped
     * group is about that wide; an NSH native input has no intrinsic width and
     * `flex-1`'s zero basis would collapse the group to its padding. The minimum
     * restates the browser's natural size while `flex-1` still lets it grow
     * (§8).
     */
    input:
      "flex-1 min-w-40 rounded-none border-0 bg-transparent px-3 py-2 text-base shadow-none outline-none sm:text-sm",
    // R-021: `.search-field__search-icon` → `pointer-events-none shrink-0
    // text-field-placeholder`.
    // R-022: the same block → `ms-3 me-0 size-4`.
    searchIcon: "pointer-events-none shrink-0 text-field-placeholder ms-3 me-0 size-4",
    // R-023: `.search-field__clear-button` → `me-2 size-5 shrink-0`, appended
    // after CloseButton's own variant classes; `size-5` overrides CloseButton's
    // `h-6 w-6` because later classes win.
    clearButton: "me-2 size-5 shrink-0",
  },
  variants: {
    // A-001: the `input` axis — `pointer` is empty so the default resolution
    // stays byte-identical; `touch` lifts the group's 36pt row to the 44pt
    // touch hit height (`min-h` overrides `h`, as in date-input-group /
    // number-field A-001). No `density` axis: the row height is a hit-area
    // concern, not a spacing preset.
    input: {
      pointer: {},
      touch: {
        group: "min-h-11",
      },
    },
    // R-033: `.search-field--full-width` → `@apply w-full`.
    // R-034: `.search-field__group--full-width` → `@apply w-full`.
    fullWidth: {
      false: {},
      true: {
        base: "w-full",
        group: "w-full",
      },
    },
    // R-025: `.search-field--primary` is an empty block; primary is the
    // default, so the value stays empty to keep the table's shape upstream's.
    // R-026: `.search-field--secondary .search-field__group` → `@apply
    // shadow-none`, with `dark:shadow-none` covering the dark half of the
    // base's `shadow.field.both`.
    // R-027: the same block's `background-color:
    // var(--search-field-group-bg)` → `bg-default`.
    // R-028: secondary reassigns the three fill tokens to `--default` /
    // `--default-hover` / `--default`; the hover and focus / invalid classes
    // that read them are `bg-default-hover` (R-029) and `bg-default`
    // (R-030 / R-031) in the group's classList.
    variant: {
      primary: {},
      secondary: {
        group: "shadow-none dark:shadow-none bg-default",
      },
    },
  },
  defaultVariants: {
    input: "pointer",
    fullWidth: false,
    variant: "primary",
  },
});

export type SearchFieldVariants = VariantProps<typeof searchFieldVariants>;
