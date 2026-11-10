import type { VariantProps } from "tailwind-variants";

import { tv } from "tailwind-variants";

/**
 * NumberField's variant table, mirroring `@heroui/styles` 3.2.7
 * `packages/styles/src/components/number-field/number-field.styles.ts`
 * expanded with the declarations of `packages/styles/components/number-field.css`.
 *
 * HeroUI's table only produces BEM class names; every declaration lives in the
 * CSS file. NSH has no BEM CSS and no descendant selectors (D18), so the blocks
 * are expanded here into the declarations they applied. State rules upstream
 * writes with `:hover`, `:focus-within`, `[data-invalid]`, `[data-disabled]` and
 * `:has()` cannot live in a static slot: they are `computed` class strings in
 * the parts (`number-field-group.tsx`, `number-field-step-button.tsx`), and the
 * three `:has()` column rules are registrations the buttons report to the root
 * (port sheet §4, §5).
 *
 * The slot names and the two variant dimensions stay exactly upstream's:
 * `base` / `group` / `input` / `incrementButton` / `decrementButton`,
 * `fullWidth` and `variant`.
 */
export const numberFieldVariants = tv({
  defaultVariants: {
    fullWidth: false,
    variant: "primary",
  },
  slots: {
    /*
     * R-001: `.number-field` → `@apply flex flex-col gap-1`.
     * R-033: `.number-field--primary` is an empty block; the default variant
     * keeps it empty below so the table's shape stays upstream's.
     * R-039: `.number-field--full-width` → `@apply w-full`.
     */
    base: "flex flex-col gap-1",

    /*
     * R-004: `.number-field__group` → `grid h-9 items-center overflow-hidden
     * rounded-field border bg-field text-sm text-field-foreground shadow-field
     * outline-none`. `dark:shadow-field-dark` is the theme note's dark half of
     * `shadow-field`.
     * R-005: `border-width: var(--border-width-field)` → `border-0`: the
     * default theme's field border width is 0, and NSH has no field border
     * width token (§8: a theme that changes it is not followed).
     * R-006 is deleted: `border-color: var(--field-border)` is `transparent`
     * in the default theme and the width is 0, so it paints nothing.
     * R-007: the three `--number-field-group-bg*` custom properties are folded
     * into their use sites: the default `bg-field` here, `bg-field-hover` in
     * R-014 and `bg-field-focus` in R-015.
     * R-008: `grid-template-columns: 1fr` → `grid-cols-1`; the registration
     * rules R-009 … R-011 append a later `grid-cols-[…]` in the group part.
     * R-012: the transition property list is inline in the group
     * (`transitionProperty`), `duration-150 ease-smooth` carry the timing here,
     * and the box-shadow's upstream `ease-out` becomes `ease-smooth` (§8).
     * R-013: `@apply motion-reduce:transition-none`.
     * R-040: `.number-field__group--full-width` → `@apply w-full`.
     */
    group: [
      "grid grid-cols-1 h-9 items-center overflow-hidden rounded-field border-0 bg-field",
      "text-sm text-field-foreground shadow-field dark:shadow-field-dark outline-none",
      "duration-150 ease-smooth motion-reduce:transition-none",
    ].join(" "),

    /*
     * R-018: `.number-field__input` → `min-w-0 rounded-none border-0
     * bg-transparent px-3 py-2 text-base tabular-nums shadow-none outline-none
     * sm:text-sm`.
     * R-019 / R-020 are deleted: `rounded-s-none` / `rounded-e-none` under a
     * `:has()` group change nothing, because this base is already
     * `rounded-none` (all four corners 0).
     * R-021 is deleted: `:focus` / `:focus-visible` → `outline-none` is in this
     * string, and NSH's native input has no other outline source.
     * R-022 is deleted: the `:-webkit-autofill` block covers the browser's UA
     * fill layer, which NSH does not draw (§8).
     * R-038 is deleted: `.number-field--secondary [data-slot="number-field-input"]
     * { @apply bg-transparent }` is already in this string.
     */
    input: [
      "min-w-0 rounded-none border-0 bg-transparent px-3 py-2 text-base tabular-nums",
      "shadow-none outline-none sm:text-sm",
    ].join(" "),

    /*
     * R-023: `.number-field__increment-button` / `.number-field__decrement-button`
     * → `flex h-full w-10 items-center justify-center rounded-none bg-transparent
     * text-field-foreground outline-none` (one shared block upstream, the same
     * string for both slots here).
     * R-024 is deleted: `border-width: var(--border-width-field)` (0),
     * `border-color: var(--field-border)` (transparent) and `border-style:
     * solid` are overridden by the separator's one-sided border in R-031 / R-032.
     * R-025: the transition property list is inline in the button part
     * (`transitionProperty`), `duration-150 ease-smooth` carry the timing here.
     * R-026: `@apply motion-reduce:transition-none`.
     * R-027: `cursor: var(--cursor-interactive)` → `cursor-pointer`.
     * R-028: `:active` / `[data-pressed=true]` → `bg-field-foreground/10` and
     * `scale(0.97)`; the pressed state is also mirrored in the render props.
     * R-031: increment-only `rounded-s-none rounded-e-field border-s
     * border-field-placeholder/15`, after `rounded-none` so it wins.
     * R-032: decrement-only `rounded-s-field rounded-e-none border-e
     * border-field-placeholder/15`.
     */
    incrementButton: [
      "flex h-full w-10 items-center justify-center rounded-none bg-transparent",
      "text-field-foreground outline-none duration-150 ease-smooth motion-reduce:transition-none",
      "cursor-pointer active:bg-field-foreground/10 active:scale-[0.97]",
      "rounded-s-none rounded-e-field border-s border-field-placeholder/15",
    ].join(" "),

    decrementButton: [
      "flex h-full w-10 items-center justify-center rounded-none bg-transparent",
      "text-field-foreground outline-none duration-150 ease-smooth motion-reduce:transition-none",
      "cursor-pointer active:bg-field-foreground/10 active:scale-[0.97]",
      "rounded-s-field rounded-e-none border-e border-field-placeholder/15",
    ].join(" "),
  },
  variants: {
    // R-039 / R-040: both the root and the group stretch.
    fullWidth: {
      false: {},
      true: {
        base: "w-full",
        group: "w-full",
      },
    },
    // R-033: `.number-field--primary` is an empty block.
    // R-034: `.number-field--secondary .number-field__group` → `@apply
    // shadow-none` plus the `--default` fill. Its hover / focus / invalid
    // reassignments are the `bg-default-hover` / `bg-default` entries in the
    // group part (R-035 … R-037).
    variant: {
      primary: {},
      secondary: {
        base: "",
        group: "shadow-none dark:shadow-none bg-default",
      },
    },
  },
});

export type NumberFieldVariants = VariantProps<typeof numberFieldVariants>;

export type NumberFieldSlots = ReturnType<typeof numberFieldVariants>;
