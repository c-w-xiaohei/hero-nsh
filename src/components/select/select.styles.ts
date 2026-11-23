import type { VariantProps } from "tailwind-variants";

import { tv } from "tailwind-variants";

// `ease.smooth`, `radius.field` and `shadow.{field,overlay}.both` of
// `src/tokens/geometry.ts` written out: the M2 class walker imports this file
// through Node ESM, which does not resolve extensionless relative specifiers,
// so the geometry module cannot be imported from a `.styles.ts`. Same pattern
// as `number-field.styles.ts`; keep in sync with `EASE_VALUES.smooth`,
// `radius` and `SHADOW_VALUES.{field,overlay}`.
const EASE_SMOOTH = "ease-[cubic-bezier(0.25,0.1,0.25,1)]";
const RADIUS_FIELD = "rounded-(--radius-field)";
const SHADOW_FIELD_BOTH =
  "shadow-[0_2px_4px_0_rgba(0,0,0,0.04),0_1px_2px_0_rgba(0,0,0,0.06),0_0_1px_0_rgba(0,0,0,0.06)] dark:shadow-[0_0_0_0_transparent_inset]";
const SHADOW_OVERLAY_BOTH =
  "shadow-[0_2px_8px_0_rgba(0,0,0,0.06),0_-6px_12px_0_rgba(0,0,0,0.03),0_14px_28px_0_rgba(0,0,0,0.08)] dark:shadow-[0_0_1px_0_rgba(255,255,255,0.3)_inset]";

/**
 * Select's variant table, mirroring `@heroui/styles` 3.2.7
 * `packages/styles/src/components/select/select.styles.ts` and the declarations
 * of `packages/styles/components/select.css` (port sheet §4, R-001 … R-050;
 * D18 drops the BEM class names, so each slot carries the declarations the
 * block applied).
 *
 * Four dimensions now: `variant` (`primary` / `secondary`, the latter
 * swaps the trigger's background) and `fullWidth` (the root and the trigger
 * grow to the field's width) as upstream; `input` and `density` as the two
 * environment axes (adapt sheet A-001) — `input` owns interaction usability
 * (the 44pt touch minimum on the trigger, hover dependence on the clear
 * button), `density` the spacing literals.
 */
export const selectVariants = tv({
  slots: {
    // R-001: `.select` → `flex flex-col gap-1`. R-003 (`w-fit` on the label) is
    // deleted: NSH's text sizes to its content. `gap-1` moved into the
    // `density` axis below (A-001).
    // R-049: `.select--full-width` → `w-full`, on the `fullWidth` dimension.
    base: "flex flex-col",
    // R-004: `.select__trigger` → the 36pt field button. `border-0` is
    // deliberate: upstream's default theme has `--field-border-width: 0px`, so
    // the resting trigger draws no line, and `border` would add 2pt of height.
    // `isolate` and `no-highlight` have no counterpart; `inline-flex` is `flex`
    // here (NSH lays out blocks).
    // `outline-none` from the upstream base is dropped: NSH reads a style class
    // anywhere in the string, so it would defeat R-010's invalid outline; NSH
    // draws no outline unless a class asks for it (the focus and invalid states
    // set theirs explicitly).
    // R-005: the duration and the curve; the property list is inline, because
    // `transition-colors` omits the shadow and `transition-all` adds radius and
    // border width.
    // R-050: `.select__trigger--full-width` → `w-full`, on the `fullWidth`
    // dimension. `px-3 py-2` moved into the `density` axis (A-001).
    trigger: [
      `relative flex min-h-9 items-center ${RADIUS_FIELD} border-0 border-field-border bg-field text-sm text-field-foreground ${SHADOW_FIELD_BOTH} select-none cursor-pointer`,
      `duration-150 ${EASE_SMOOTH} motion-reduce:transition-none`,
    ].join(" "),
    // R-018: `.select__value` → `flex-1 text-start text-base text-current
    // sm:text-sm`. `wrap-break-word` is dropped: NSH has neither the class nor
    // an `overflowWrap` style key (port sheet §8). `flex-auto` instead of
    // `flex-1`: NSH's `flex-1` is `flex-basis: 0`, which collapses the value to
    // zero width inside a shrink-to-fit trigger (the Select root is a flex
    // column whose width follows its content unless the caller sets one);
    // `flex-auto` keeps the text's own width and still grows in a sized
    // trigger (registered in §6 / §8).
    value: "flex-auto text-start text-base text-current sm:text-sm",
    // R-028: `.select__indicator` → pinned to the inline end, vertically
    // centered, coloured like the placeholder. The only property that changes
    // is the transform (the open rotation, R-029).
    indicator:
      "absolute inset-y-0 end-2 my-auto flex shrink-0 items-center justify-center text-field-placeholder transition-transform duration-150",
    // R-021: `.select__clear-button` → the 20pt box inside the trigger;
    // `isolate`, `no-highlight` and `transform-gpu` have no counterpart.
    // R-023: `opacity 150ms var(--ease-smooth)` while it is not empty; the
    // empty state overrides it with `transition-none` (R-024), because upstream
    // carries the transition on `:not([data-empty])`.
    clearButton: [
      "relative flex size-5 shrink-0 origin-center items-center justify-center self-center rounded-xl bg-transparent p-1 text-muted select-none cursor-pointer",
      // R-027: `:active` → `transform: scale(0.93)`. It stays in the base:
      // upstream's `:active` is not hover-gated, and the JS `pressed` channel
      // has no second writer to it.
      "active:scale-[0.93]",
      `transition-opacity duration-150 ${EASE_SMOOTH} motion-reduce:transition-none`,
    ].join(" "),
    // R-046: `.select__popover` → the 22pt overlay card. `radius-2xl` (16) +
    // `spacing` (4) × 1.5 = 22 in this theme, so the min() cap never applies.
    // The scroll classes (`overflow-y-auto`, `scroll-py-1`, `overscroll-
    // contain`, `scrollbar`) are not Tailwind here: the component wraps the
    // list in `Scroll` and clips the corners with `overflow-hidden`.
    // R-036 / R-037: the duration and curve of the enter and exit transitions
    // (the property list and the shorter exit are inline).
    popover: [
      `bg-overlay p-0 text-sm text-overlay-foreground rounded-[22px] ${SHADOW_OVERLAY_BOTH} overflow-hidden`,
      `duration-150 ${EASE_SMOOTH}`,
    ].join(" "),
  },
  defaultVariants: {
    fullWidth: false,
    variant: "primary",
    input: "pointer",
    density: "default",
  },
  variants: {
    fullWidth: {
      false: {},
      // R-049, R-050.
      true: {
        base: "w-full",
        trigger: "w-full",
      },
    },
    variant: {
      // R-012: `.select--primary` has no declarations.
      primary: {},
      // R-013: `.select--secondary .select__trigger` → `shadow-none` and the
      // background token; the three `--select-trigger-bg*` variables collapse
      // into classes.
      secondary: {
        trigger: "shadow-none bg-default",
      },
    },
    // A-001: the `input` axis owns interaction usability. On the trigger the
    // touch cell carries the visible half of the 44pt minimum
    // (`MIN_HIT_TARGET_BY_DENSITY`'s default row; the invisible `hitSlop`
    // half lives in the trigger's `createPressFeedback` seam). On the clear
    // button R-026's `hover:bg-default-hover` moves under `pointer`: a hover
    // dependency resolves only where a pointer exists, and web's sticky
    // hover would otherwise keep the tint after a touch press (close-button
    // A-001's same move). `touch` is empty: R-027's `active:` scale is the
    // press channel there (popover-trigger A-005's twin).
    input: {
      pointer: {
        clearButton: "hover:bg-default-hover",
      },
      touch: {
        trigger: "min-h-11",
      },
    },
    // A-001: the `density` axis owns the spacing literals — `gap-1` on the
    // root and `px-3 py-2` on the trigger moved out of the base because
    // spacing literals have no token exit (list-box A-001's same reason).
    // `default` is the shipped value; `compact` tightens each one step.
    density: {
      default: {
        base: "gap-1",
        trigger: "px-3 py-2",
      },
      compact: {
        base: "gap-0.5",
        trigger: "px-2 py-1",
      },
    },
  },
});

export type SelectVariants = VariantProps<typeof selectVariants>;
