import type { VariantProps } from "tailwind-variants";

import { tv } from "tailwind-variants";

import { ease, radius, shadow } from "../../tokens/geometry";

/**
 * InputGroup's variant table, mirroring `@heroui/styles` 3.2.7
 * (`packages/styles/src/components/input-group/input-group.styles.ts`) expanded
 * with the declarations of `packages/styles/components/input-group.css`.
 *
 * Upstream's table has two dimensions (`variant`, `fullWidth`) and four BEM
 * slots (`base` / `input` / `prefix` / `suffix`). NSH has no BEM CSS, no
 * descendant selectors and no `:has()` (D18), so every state rule of the
 * stylesheet becomes a `computed` class string in the part that owns it, and
 * the three `:has()` rules become registrations a part reports to its root
 * (`input-group-context.ts`). The four slot names stay exactly upstream's.
 */
export const inputGroupVariants = tv({
  slots: {
    // R-005: `.input-group` → `inline-flex min-h-9 items-center rounded-field
    // border bg-field text-sm text-field-foreground shadow-field outline-none`;
    // `dark:shadow-field-dark` is the dark half of `shadow-field`.
    // R-006: `border-width: var(--border-width-field)` and
    // `border-color: var(--field-border)` are deleted — the default theme fixes
    // the width at 0 with a transparent colour and NSH has neither token, so
    // `border-0` stands in.
    // R-007: the `--input-group-bg*` custom properties are deleted: they only
    // fed the autofill cover (R-019, deleted) and the secondary variant, which
    // expands into concrete `bg-default` / `bg-default-hover` (R-033 … R-036).
    // R-010: `@apply motion-reduce:transition-none`, after the timing classes.
    // R-009's property list is inline style in the root (one owner per
    // property), while `duration-150 ease-smooth` carry the timing here.
    base: [
      `inline-flex min-h-9 items-center ${radius.field} border-0 bg-field`,
      `text-sm text-field-foreground ${shadow.field.both} outline-none`,
      `duration-150 ${ease.smooth} motion-reduce:transition-none`,
    ].join(" "),

    // R-015: `.input-group__input` → the full upstream declaration list.
    // `basis-auto` is the one added class: NSH sizes an inline-flex container
    // from a `flex-1` child (flex-basis 0) as 0 (date-input-group R-009, same
    // measurement).
    // R-018: `&:focus, &:focus-visible { @apply outline-none }` is already part
    // of this slot's `outline-none`; the group paints the focus appearance.
    // R-019: the autofill cover block is deleted — NSH's native input has no
    // browser autofill paint to cover, and no `appearance` / `clip-path` /
    // text-fill-colour channel.
    // R-037: `.input-group--secondary [data-slot="input-group-input"]` →
    // `bg-transparent` is already part of this slot, so the variant needs no
    // declaration of its own.
    input: [
      `flex-1 basis-auto ${radius.field} border-0 bg-transparent`,
      "px-3 py-2 text-base shadow-none outline-none placeholder:text-field-placeholder sm:text-sm",
    ].join(" "),

    // R-022: `.input-group__prefix` → `flex h-full items-center justify-center
    // rounded-s-field rounded-e-none bg-transparent px-3 text-field-placeholder`.
    // R-023: the four border declarations are deleted — width 0 in the default
    // theme, so they paint no pixel (R-006's reason).
    // R-026: `@apply motion-reduce:transition-none`.
    // R-025's property list is inline style in the part; the timing is here.
    prefix: [
      `flex h-full items-center justify-center ${radius.fieldStart} rounded-e-none`,
      `bg-transparent px-3 text-field-placeholder duration-150 ${ease.smooth} motion-reduce:transition-none`,
    ].join(" "),

    // R-027: `.input-group__suffix` → `flex h-full items-center justify-center
    // rounded-s-none rounded-e-field bg-transparent px-3 text-field-placeholder`.
    // R-028: its border declarations are deleted, as R-023.
    // R-031: `@apply motion-reduce:transition-none`.
    // R-030's property list is inline style in the part; the timing is here.
    suffix: [
      `flex h-full items-center justify-center rounded-s-none ${radius.fieldEnd}`,
      `bg-transparent px-3 text-field-placeholder duration-150 ${ease.smooth} motion-reduce:transition-none`,
    ].join(" "),
  },
  variants: {
    // R-032: `.input-group--primary` is an empty block; the dimension stays with
    // no class of its own. The default here is `primary`, as upstream's table.
    // R-033: `.input-group--secondary` → `@apply shadow-none` plus
    // `background-color: var(--input-group-bg)`, whose default is `--default`.
    // The custom-property chain expands into the concrete classes the root
    // applies for hover / focus / invalid (R-034 … R-036).
    variant: {
      primary: { base: "" },
      secondary: { base: "shadow-none bg-default" },
    },
    // R-038: `.input-group--full-width` → `@apply w-full`.
    fullWidth: {
      false: {},
      true: { base: "w-full" },
    },
  },
  defaultVariants: {
    fullWidth: false,
    variant: "primary",
  },
});

export type InputGroupVariants = VariantProps<typeof inputGroupVariants>;

export type InputGroupVariant = NonNullable<InputGroupVariants["variant"]>;
