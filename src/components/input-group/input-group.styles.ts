import type { VariantProps } from "tailwind-variants";

import { tv } from "tailwind-variants";

// `ease.smooth`, `radius.*` and `shadow.field.both` of
// `src/tokens/geometry.ts` written out: the M2 class walker imports this file
// through Node ESM, which does not resolve extensionless relative specifiers,
// so the geometry module cannot be imported from a `.styles.ts`. Same pattern
// as `switch.styles.ts` / `pagination.styles.ts`; keep in sync with
// `EASE_VALUES.smooth`, `radius` and `SHADOW_VALUES.field`.
const EASE_SMOOTH = "ease-[cubic-bezier(0.25,0.1,0.25,1)]";
const RADIUS_FIELD = "rounded-(--radius-field)";
const RADIUS_FIELD_START = "rounded-s-(--radius-field)";
const RADIUS_FIELD_END = "rounded-e-(--radius-field)";
const SHADOW_FIELD_BOTH =
  "shadow-[0_2px_4px_0_rgba(0,0,0,0.04),0_1px_2px_0_rgba(0,0,0,0.06),0_0_1px_0_rgba(0,0,0,0.06)] dark:shadow-[0_0_0_0_transparent_inset]";

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
      `inline-flex min-h-9 items-center ${RADIUS_FIELD} border-0 bg-field`,
      `text-sm text-field-foreground ${SHADOW_FIELD_BOTH} outline-none`,
      `duration-150 ${EASE_SMOOTH} motion-reduce:transition-none`,
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
      `flex-1 basis-auto ${RADIUS_FIELD} border-0 bg-transparent`,
      "px-3 py-2 text-base shadow-none outline-none placeholder:text-field-placeholder sm:text-sm",
    ].join(" "),

    // R-022: `.input-group__prefix` → `flex h-full items-center justify-center
    // rounded-s-field rounded-e-none bg-transparent px-3 text-field-placeholder`.
    // R-023: the four border declarations are deleted — width 0 in the default
    // theme, so they paint no pixel (R-006's reason).
    // R-026: `@apply motion-reduce:transition-none`.
    // R-025's property list is inline style in the part; the timing is here.
    prefix: [
      `flex h-full items-center justify-center ${RADIUS_FIELD_START} rounded-e-none`,
      `bg-transparent px-3 text-field-placeholder duration-150 ${EASE_SMOOTH} motion-reduce:transition-none`,
    ].join(" "),

    // R-027: `.input-group__suffix` → `flex h-full items-center justify-center
    // rounded-s-none rounded-e-field bg-transparent px-3 text-field-placeholder`.
    // R-028: its border declarations are deleted, as R-023.
    // R-031: `@apply motion-reduce:transition-none`.
    // R-030's property list is inline style in the part; the timing is here.
    suffix: [
      `flex h-full items-center justify-center rounded-s-none ${RADIUS_FIELD_END}`,
      `bg-transparent px-3 text-field-placeholder duration-150 ${EASE_SMOOTH} motion-reduce:transition-none`,
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
    // A-001: the `input` axis of the encapsulation model. `pointer` keeps the
    // pre-axis output byte-for-byte (an empty cell); `touch` raises the row's
    // `min-h-9` (36pt) to `min-h-11` (44pt) — the hit face lives on the row,
    // as a press anywhere in it focuses the control (R-005's handlePress).
    // `density` gets no axis here: the row height is the hit face, not a
    // spacing preset.
    input: {
      pointer: {},
      touch: { base: "min-h-11" },
    },
  },
  defaultVariants: {
    fullWidth: false,
    variant: "primary",
    // A-001: a caller that resolves `inputGroupVariants` without the axis
    // (the context fallback) gets the pre-axis output.
    input: "pointer",
  },
});

export type InputGroupVariants = VariantProps<typeof inputGroupVariants>;

export type InputGroupVariant = NonNullable<InputGroupVariants["variant"]>;
