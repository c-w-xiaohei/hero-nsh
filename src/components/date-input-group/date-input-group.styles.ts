import type { VariantProps } from "tailwind-variants";

import { tv } from "tailwind-variants";

/**
 * DateInputGroup's variant table, mirroring `@heroui/styles` 3.2.7
 * (`packages/styles/src/components/date-input-group/date-input-group.styles.ts`)
 * expanded with the declarations of
 * `packages/styles/components/date-input-group.css`.
 *
 * HeroUI's table has two dimensions (`variant`, `fullWidth`) and six BEM slots.
 * NSH has no BEM CSS and no descendant selectors (D18), so every state rule of
 * the stylesheet is a `computed` class string in the part that owns it, and the
 * three `:has()` rules become registrations a part reports to its root
 * (`date-input-group-context.ts`). The six slot names are kept exactly.
 */
export const dateInputGroupVariants = tv({
  slots: {
    // R-001: `.date-input-group` → `inline-flex h-9 items-center overflow-hidden
    // rounded-field bg-field text-sm text-field-foreground shadow-field
    // outline-none`; `dark:shadow-field-dark` is the theme note's dark half of
    // `shadow-surface` and `shadow-field`.
    // R-002: the stylesheet's `border-width: var(--border-width-field)` plus
    // `border-color: var(--field-border)` are deleted: the default theme fixes
    // the width at 0 with a transparent colour, and NSH has neither token, so
    // `border-0` stands in (`border` and this rule collapse into `border-0`).
    // R-003: transition property list, duration and curve. `transition` gives
    // the class-level default set, the inline `transitionProperty` in the root
    // narrows it to the three upstream properties, and `duration-150 ease-smooth`
    // carry the timing (box-shadow's upstream `ease-out` becomes `ease-smooth`;
    // registered in the port sheet §8).
    // R-004: `@apply motion-reduce:transition-none`.
    base: [
      "inline-flex h-9 items-center overflow-hidden rounded-field border-0 bg-field",
      "text-sm text-field-foreground shadow-field dark:shadow-field-dark outline-none",
      "transition duration-150 ease-smooth motion-reduce:transition-none",
    ].join(" "),

    // R-009: `.date-input-group__input` → the full upstream declaration list.
    // `basis-auto` is the one added class: NSH sizes an inline-flex container
    // from a `flex-1` child (flex-basis 0) as 0, which collapsed the group in a
    // shrink-to-fit column and laid out one segment; with an automatic basis the
    // group keeps its content width and the input still grows (port sheet §8).
    // R-013: `&:focus, &:focus-visible { @apply outline-none; }` is already part
    // of this slot's `outline-none`; the group paints the focus appearance.
    // R-032: `.date-input-group--secondary [data-slot="date-input-group-input"]
    // { @apply bg-transparent }` is deleted — this base already carries
    // `bg-transparent`, so the secondary variant needs nothing of its own.
    input: [
      "flex flex-1 basis-auto cursor-text items-center gap-px rounded-none border-0 bg-transparent",
      "px-3 py-2 text-base shadow-none outline-none sm:text-sm",
    ].join(" "),

    // R-014: `.date-input-group__input-container` → `flex flex-1 items-center`
    // with `width: fit-content`. The scroll view itself takes `flex-1 w-fit`;
    // the flex row and the centering live on its content layer, which the part
    // passes as `contentClass` (a Scroll hosts children in that layer).
    // `basis-auto` has the same sizing reason as R-009.
    inputContainer: "flex-1 basis-auto w-fit",

    // R-025: `.date-input-group__prefix` → `pointer-events-none shrink-0
    // text-field-placeholder ms-3 me-0 flex items-center`. When a DatePicker /
    // DateRangePicker provides the affix context, the part swaps
    // `pointer-events-none` for `pointer-events-auto`.
    prefix:
      "pointer-events-none shrink-0 text-field-placeholder ms-3 me-0 flex items-center",

    // R-018: `.date-input-group__segment` → `inline-block rounded-md px-0.5
    // text-end text-nowrap outline-none`; NSH computes `inline-block` as a
    // block box, which lays out the same inside the flex row.
    segment: "inline-block rounded-md px-0.5 text-end text-nowrap outline-none",

    // R-026: `.date-input-group__suffix` → `pointer-events-none shrink-0
    // text-field-placeholder me-3 flex items-center`; the affix context swaps
    // the pointer rule exactly as on the prefix.
    suffix: "pointer-events-none shrink-0 text-field-placeholder me-3 flex items-center",
  },
  variants: {
    // R-033: `.date-input-group--full-width` → `@apply w-full`.
    fullWidth: {
      false: {},
      true: { base: "w-full" },
    },
    // R-027: `.date-input-group--primary` is an empty block; the dimension is
    // kept with no class of its own.
    // R-028: `.date-input-group--secondary` → `@apply shadow-none` plus
    // `background-color: var(--date-input-group-bg)` whose default is
    // `var(--default)`. The local `--date-input-group-bg-*` variables collapse
    // into the hover / focus / invalid rules the root applies (R-029 … R-031).
    variant: {
      primary: { base: "" },
      secondary: { base: "shadow-none bg-default" },
    },
  },
  defaultVariants: {
    fullWidth: false,
    variant: "primary",
  },
});

export type DateInputGroupVariants = VariantProps<typeof dateInputGroupVariants>;

export type DateInputGroupVariant = NonNullable<DateInputGroupVariants["variant"]>;
