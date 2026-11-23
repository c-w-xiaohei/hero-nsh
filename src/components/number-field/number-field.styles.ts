import type { VariantProps } from "tailwind-variants";

import { tv } from "tailwind-variants";

// `ease.smooth`, `radius.*` and `shadow.field.both` of
// `src/tokens/geometry.ts` written out: the M2 class walker imports this file
// through Node ESM, which does not resolve extensionless relative specifiers,
// so the geometry module cannot be imported from a `.styles.ts`. Same pattern
// as `input-group.styles.ts`; keep in sync with `EASE_VALUES.smooth`, `radius`
// and `SHADOW_VALUES.field`.
const EASE_SMOOTH = "ease-[cubic-bezier(0.25,0.1,0.25,1)]";
const RADIUS_FIELD = "rounded-(--radius-field)";
const RADIUS_FIELD_START = "rounded-s-(--radius-field)";
const RADIUS_FIELD_END = "rounded-e-(--radius-field)";
const SHADOW_FIELD_BOTH =
  "shadow-[0_2px_4px_0_rgba(0,0,0,0.04),0_1px_2px_0_rgba(0,0,0,0.06),0_0_1px_0_rgba(0,0,0,0.06)] dark:shadow-[0_0_0_0_transparent_inset]";

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
 * The slot names and the two upstream variant dimensions stay upstream's:
 * `base` / `group` / `input` / `incrementButton` / `decrementButton`,
 * `fullWidth` and `variant`. A-001 adds the encapsulation model's `input`
 * axis and one internal slot, `groupCols`: the step-column width the group
 * interpolates into its `grid-cols-[…]` template (`w-10` pointer, `w-11`
 * touch). It carries a class, not the length itself — every string in the
 * table must class-check — and `GROUP_COL_WIDTHS` below translates the class
 * to the length the group's template and the field probe consume.
 */
export const numberFieldVariants = tv({
  defaultVariants: {
    fullWidth: false,
    variant: "primary",
    // A-001: a bare `numberFieldVariants()` call keeps producing exactly the
    // pointer output the table made before the axis existed.
    input: "pointer",
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
     * outline-none`. The dark half comes from `shadow.field` in
     * `src/tokens/geometry.ts`.
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
      `grid grid-cols-1 h-9 items-center overflow-hidden ${RADIUS_FIELD} border-0 bg-field`,
      `text-sm text-field-foreground ${SHADOW_FIELD_BOTH} outline-none`,
      `duration-150 ${EASE_SMOOTH} motion-reduce:transition-none`,
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
     * A-001: the `active:*` pair moves into the `input: "pointer"` cell
     * below — under touch the press-feedback seam's `scale` owns the
     * transform and its press overlay the feedback, and two writers may not
     * share the channel.
     * R-031: increment-only `rounded-s-none rounded-e-field border-s
     * border-field-placeholder/15`, after `rounded-none` so it wins.
     * R-032: decrement-only `rounded-s-field rounded-e-none border-e
     * border-field-placeholder/15`.
     */
    incrementButton: [
      "flex h-full w-10 items-center justify-center rounded-none bg-transparent",
      `text-field-foreground outline-none duration-150 ${EASE_SMOOTH} motion-reduce:transition-none`,
      "cursor-pointer",
      `rounded-s-none ${RADIUS_FIELD_END} border-s border-field-placeholder/15`,
    ].join(" "),

    decrementButton: [
      "flex h-full w-10 items-center justify-center rounded-none bg-transparent",
      `text-field-foreground outline-none duration-150 ${EASE_SMOOTH} motion-reduce:transition-none`,
      "cursor-pointer",
      `${RADIUS_FIELD_START} rounded-e-none border-e border-field-placeholder/15`,
    ].join(" "),

    // A-001: the step-column width the group reads through
    // `slots.groupCols()` and interpolates into its `grid-cols-[…]` template.
    // A class (`w-10` / `w-11`), not a length — a literal would fail the class
    // check. `GROUP_COL_WIDTHS` maps the class back to the length.
    groupCols: "",
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
    // A-001: the `input` axis of the encapsulation model — it owns
    // interaction usability (the min hit size, no hover dependence, the
    // touch feedback channels). `pointer` holds the desktop table
    // byte-for-byte, R-028's `active:` pair included; `touch` raises the row
    // to the 44 pt target (`min-h-11` over `h-9`, the date-input-group A-001
    // value), widens the step columns to 44 pt (`w-11` over `w-10`, and
    // `groupCols` so the grid template follows), and carries no `active:` —
    // the seam presses instead. No `density` axis: the row height and column
    // width are hit geometry, not a spacing preset.
    input: {
      pointer: {
        incrementButton: "active:bg-field-foreground/10 active:scale-[0.97]",
        decrementButton: "active:bg-field-foreground/10 active:scale-[0.97]",
        groupCols: "w-10",
      },
      touch: {
        group: "min-h-11",
        incrementButton: "w-11",
        decrementButton: "w-11",
        groupCols: "w-11",
      },
    },
  },
});

/**
 * The length each `groupCols` class carries (`w-10` → `40px`, `w-11` →
 * `44px`). The slot cannot store the length itself: every string in the tv()
 * config is class-checked, and a raw `"40px"` is not a class. The root maps
 * `slots.groupCols()`'s class to this length for the group's `grid-cols-[…]`
 * template and the field probe.
 */
export const GROUP_COL_WIDTHS: Record<string, string> = {
  "w-10": "40px",
  "w-11": "44px",
};

export type NumberFieldVariants = VariantProps<typeof numberFieldVariants>;

export type NumberFieldSlots = ReturnType<typeof numberFieldVariants>;
