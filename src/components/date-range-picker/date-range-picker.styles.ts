import type { VariantProps } from "tailwind-variants";

import { tv } from "tailwind-variants";

/**
 * DateRangePicker's slots mirror HeroUI 3.2.7's `dateRangePickerVariants`
 * (`packages/styles/src/components/date-range-picker/date-range-picker.styles.ts`):
 * the same five names, no variant axes. Each rule of the CSS block
 * (`packages/styles/components/date-range-picker.css`) is expanded into NSH
 * classes and marked with its port-sheet id at the slot it lands in; the state
 * rules live in the parts that own the state.
 *
 * The BEM class names of the CSS are not emitted (D18): the declarations go
 * into these five strings.
 *
 * The geometry classes are written out instead of being imported from
 * `src/tokens/geometry.ts`: the G2 class check loads this file with plain Node,
 * which resolves neither an extensionless relative import nor a `.ts` one, so a
 * `.styles.ts` imports only `tailwind-variants`. The two strings below are
 * exactly `shadow.overlay.both` (R-019) and `ease.smooth` (R-018) of that file;
 * keep them in step with it.
 */
export const dateRangePickerVariants = tv({
  defaultVariants: {},
  slots: {
    // R-001: `.date-range-picker { display:inline-flex; flex-direction:column;
    // gap:0.25rem }`. A View already lays out as a column, so only the gap is
    // written; `w-fit` reproduces what `inline-flex` does in a block parent,
    // where NSH treats it as a block (skill rule 5, §4c G-001: 274.1 without a
    // caller width).
    base: "w-fit gap-1",
    // R-013: `.date-range-picker__popover { width:fit-content;
    // background-color:bg-overlay; padding:0.75rem }` — `w-fit` keeps the range
    // calendar from being squeezed (§4c G-002: 276 = 252 + 24).
    // R-018: `motion-reduce:transition-none` and the enter timing (150ms
    // smooth) of the animation the CSS puts on this layer.
    // R-019: `box-shadow: var(--overlay-shadow)` — `shadow.overlay.both` of
    // `src/tokens/geometry.ts` written out: the light and the dark layer,
    // because NSH cannot switch one shadow token with the appearance.
    // R-020: `border-radius: min(32px, calc(var(--radius) * 2.5))` = 20px in
    // this theme (measured, §4c G-002).
    // R-021: `outline-none` — the layer takes the focus but never draws a ring.
    popover:
      "w-fit bg-overlay p-3 rounded-[20px] shadow-[0_2px_8px_0_rgba(0,0,0,0.06),0_-6px_12px_0_rgba(0,0,0,0.03),0_14px_28px_0_rgba(0,0,0,0.08)] dark:shadow-[0_0_1px_0_rgba(255,255,255,0.3)_inset] outline-none duration-150 ease-[cubic-bezier(0.25,0.1,0.25,1)] motion-reduce:transition-none",
    // R-012: `.date-range-picker__range-separator { padding-inline:0.25rem;
    // color:text-field-placeholder; user-select:none }`. `shrink-0` is
    // redundant (NSH's flexShrink defaults to 0) and written to make "does not
    // compress" the explicit intent; §4c G-003: 12.7 = 4 + 4 + the text.
    rangeSeparator: "px-1 shrink-0 text-field-placeholder select-none",
    // R-004: `.date-range-picker__trigger { display:inline-flex; width:100%;
    // align-items:center; border-radius:rounded-field; padding:0.25rem;
    // font-size:0.875rem }`. `flex` is the row; `w-full` resolves against the
    // content width of the affix it sits in (§4c G-001: 24 = 16 + 8).
    // R-006: `cursor: var(--cursor-interactive)` → `cursor-pointer`.
    // R-008: `motion-reduce:transition-none`.
    // R-007's `box-shadow` is the only transitioned property; its list is
    // inline in the part (one property, one owner) and the 150ms `ease-out`
    // curve rides on this class.
    // R-005 (`no-highlight`, a `-webkit-tap-highlight-color`) is deleted: NSH
    // has no touch highlight to turn off.
    trigger:
      "flex w-full items-center rounded-(--radius-field) p-1 text-sm cursor-pointer duration-150 ease-out motion-reduce:transition-none",
    // R-011: `.date-range-picker__trigger-indicator { display:inline-flex;
    // size:1rem; align-items:center; justify-content:center;
    // color:text-field-placeholder }`.
    triggerIndicator: "flex size-4 items-center justify-center text-field-placeholder",
  },
  variants: {},
});

export type DateRangePickerVariants = VariantProps<typeof dateRangePickerVariants>;
