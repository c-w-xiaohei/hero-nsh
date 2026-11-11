import type { VariantProps } from "tailwind-variants";

import { tv } from "tailwind-variants";

/**
 * InputOTP's slot table, HeroUI 3.2.7
 * (`packages/styles/src/components/input-otp/input-otp.styles.ts` plus
 * `packages/styles/components/input-otp.css`, and the inline styles
 * `input-otp@1.4.2` writes on its container and its input).
 *
 * The slot names, the one `variant` axis and its default are upstream's. Every
 * rule of port sheet section 4 whose destination is a variant class is folded
 * in below with its id; the state rules (`classList`) live in the parts, and
 * the two inline-style and three structural rules are in `input-otp-root.tsx`
 * and `input-otp-slot.tsx`.
 */
export const inputOTPVariants = tv({
  defaultVariants: {
    variant: "primary",
  },
  slots: {
    // R-001: `.input-otp` → `relative flex w-full items-center gap-2`.
    // R-003: the container's inline style → `select-none pointer-events-none
    // cursor-text`. The disabled cursor is R-002's, on the root's classList.
    base: "relative flex w-full items-center gap-2 select-none pointer-events-none cursor-text",

    // R-020: `.input-otp__caret` → `absolute h-4 w-[2px] rounded-sm
    // bg-field-placeholder`. The explicit centring is what CSS's static
    // position inside a centred flex box gives the upstream caret; the
    // absolutely positioned box has no static position of its own here.
    caret:
      "absolute left-1/2 top-1/2 h-4 w-[2px] -translate-x-1/2 -translate-y-1/2 rounded-sm bg-field-placeholder",

    // R-004: `.input-otp__group` → `flex min-w-0 items-center gap-2`.
    group: "flex min-w-0 items-center gap-2",

    // R-029: the input's inline box — `absolute inset-0 h-full w-full
    // pointer-events-auto` (upstream's `.input-otp__input` has no CSS block;
    // this string is the whole `input` slot).
    // R-030: its look — transparent text, background, border, outline, shadow
    // and selection highlight. NSH's `selection:` only carries the highlight
    // colour, not the selected text's (`nsh_twref` 596), so the transparent
    // text and the transparent highlight together hide the selection, as
    // upstream's `::selection { background: transparent; color: transparent }`.
    // The native caret is off through `caret={false}`, the property's one owner.
    // R-031: its metrics — `leading-none tracking-[-0.5em] font-mono
    // tabular-nums`.
    input:
      "absolute inset-0 h-full w-full pointer-events-auto border-0 bg-transparent p-0 font-mono leading-none tracking-[-0.5em] tabular-nums text-transparent outline-none shadow-none selection:bg-transparent placeholder:text-transparent",

    // R-022: `.input-otp__separator` → `h-[2px] w-[6px] shrink-0 rounded-sm
    // bg-separator`.
    separator: "h-[2px] w-[6px] shrink-0 rounded-sm bg-separator",

    // R-005: the slot's box — `relative flex h-10 w-[2.375rem] min-w-0 flex-1
    // items-center justify-center` (`w-9.5` is 2.375rem; the bracket form
    // needs no fractional spacing step).
    // R-006: `bg-field text-field-foreground shadow-field dark:shadow-field-dark`
    // (the shadow cannot switch with the appearance on its own).
    // R-007: `rounded-field text-sm font-semibold outline-none`.
    // R-008: `border-width: var(--border-width-field)` is 0 in the default
    // theme, so R-006's `border` is zeroed with `border-0`.
    // R-010: `transition: … 150ms var(--ease-smooth)` → `transition
    // duration-150 ease-smooth motion-reduce:transition-none`; R-011 writes the
    // three transitioned properties inline.
    slot: "relative flex h-10 w-[2.375rem] min-w-0 flex-1 items-center justify-center border-0 rounded-field bg-field dark:bg-default text-field-foreground text-sm font-semibold shadow-field dark:shadow-field-dark outline-none transition duration-150 ease-smooth motion-reduce:transition-none",

    // R-017: `.input-otp__slot-value` → `text-lg leading-6
    // tracking-[-0.27px]`.
    // R-019: `transform-origin: bottom center` → `origin-bottom`.
    // R-018 / R-028: the `slot-value-in` keyframes are the native animation in
    // `input-otp-slot.tsx`.
    slotValue: "text-lg leading-6 tracking-[-0.27px] origin-bottom",
  },
  variants: {
    variant: {
      // R-023: `.input-otp--primary` has no declarations; the key stays so the
      // table has upstream's shape.
      primary: {},
      secondary: {
        // R-024: `box-shadow: none` plus the dark half R-006 added.
        // R-025: `background-color: var(--input-otp-slot-bg)` folded into its
        // value, `--default`. The focus fill is R-027's classList entry.
        slot: "bg-default shadow-none dark:shadow-none",
      },
    },
  },
});

export type InputOTPVariants = VariantProps<typeof inputOTPVariants>;
