import type { VariantProps } from "tailwind-variants";

import { tv } from "tailwind-variants";

import { ease, radius, shadow } from "../../tokens/geometry";

/**
 * DatePicker's slots mirror HeroUI 3.2.7's `datePickerVariants`
 * (`packages/styles/src/components/date-picker/date-picker.styles.ts`): the
 * same four names, no variant axes. Each of the CSS block's rules is expanded
 * into NSH classes and marked with its port-sheet id at the slot it lands in;
 * the state rules live in the parts that own the state.
 *
 * The BEM class names of the CSS are not emitted (D18): the declarations go
 * into these four strings.
 */
export const datePickerVariants = tv({
  defaultVariants: {},
  slots: {
    // R-001: `.date-picker { display:inline-flex; flex-direction:column;
    // gap:0.25rem }`. A View already lays out as a column, so only the gap is
    // written; `w-fit` reproduces what `inline-flex` does in a block parent,
    // where NSH treats it as a block (skill rule 5, §4c G-001: the root is as
    // wide as its widest child).
    base: "w-fit gap-1",
    // R-012: `.date-picker__popover { width:fit-content; background-color:
    // bg-overlay; padding:0.75rem }` — `w-fit` keeps the calendar from being
    // squeezed (§4c G-002: 276 = 252 + 24).
    // R-017: `motion-reduce:transition-none` and the enter timing (150ms
    // smooth) of the animation the CSS puts on this layer.
    // R-018: `box-shadow: var(--overlay-shadow)` — the light and the dark
    // layer, because NSH cannot switch one shadow token with the appearance.
    // R-019: `border-radius: min(32px, calc(var(--radius) * 2.5))` = 20px in
    // this theme (measured, §4c G-002).
    // R-020: `outline-none` — the layer takes the focus but never draws a ring.
    popover: `w-fit bg-overlay p-3 rounded-[20px] ${shadow.overlay.both} outline-none duration-150 ${ease.smooth} motion-reduce:transition-none`,
    // R-004: `.date-picker__trigger { display:inline-flex; width:100%;
    // align-items:center; border-radius:rounded-field; padding:0.25rem;
    // font-size:0.875rem }`. `flex` is the row; `w-full` resolves against the
    // content width of the affix it sits in (§4c G-003: 24 = 16 + 8).
    // R-006: `cursor: var(--cursor-interactive)` → `cursor-pointer`.
    // R-008: `motion-reduce:transition-none`.
    // R-007's `box-shadow` is the only transitioned property; its list is
    // inline in the part (one property, one owner) and the 150ms `ease-out`
    // curve rides on this class.
    // R-005 (`no-highlight`, a `-webkit-tap-highlight-color`) is deleted: NSH
    // has no touch highlight to turn off.
    trigger: `flex w-full items-center ${radius.field} p-1 text-sm cursor-pointer duration-150 ease-out motion-reduce:transition-none`,
    // R-011: `.date-picker__trigger-indicator { display:inline-flex; size:1rem;
    // align-items:center; justify-content:center; color:text-field-placeholder }`.
    triggerIndicator: "flex size-4 items-center justify-center text-field-placeholder",
  },
  variants: {},
});

export type DatePickerVariants = VariantProps<typeof datePickerVariants>;
