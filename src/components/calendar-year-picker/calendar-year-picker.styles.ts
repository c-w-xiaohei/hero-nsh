import type { VariantProps } from "tailwind-variants";

import { tv } from "tailwind-variants";

/**
 * CalendarYearPicker's slots mirror HeroUI 3.2.7's variant table (same slot
 * names, no variant axes) with `calendar-year-picker.css` expanded into NSH
 * classes. Port-sheet §4.2 marks each rule at the slot it lands in.
 */
export const calendarYearPickerVariants = tv({
  defaultVariants: {},
  slots: {
    // R-045: trigger layout; R-046: interactive cursor. R-047's
    // `touch-action: manipulation` has no NSH equivalent.
    trigger: "flex flex-1 items-center justify-start gap-1 rounded-lg outline-none cursor-pointer",
    // R-049: heading typography and inherited foreground; R-054's open color is
    // context-driven and comes after this class, so it wins when open.
    // R-050: color 150ms `ease-out`.
    triggerHeading:
      "text-sm font-medium text-foreground transition-colors duration-150 ease-out motion-reduce:transition-none",
    // R-051: indicator typography; the open rotation is context-driven (R-053).
    // R-052: transform 150ms `ease-out`.
    triggerIndicator:
      "text-xs text-accent-soft-foreground rtl:rotate-180 transition-transform duration-150 ease-out motion-reduce:transition-none",
    // R-055/R-060: overlay box, hidden at rest; `z-10` keeps it above the date
    // grid even while that grid owns a transition. R-060's 200ms + 50ms delay
    // runs only on open; closing is instant upstream, so the base keeps
    // `transition-none` and the open class alone turns opacity transitions on.
    yearGrid: "absolute inset-x-0 z-10 pointer-events-none invisible opacity-0 transition-none",
    // R-061: a grid item is blockified and stretched to its column, so the
    // button is `w-full` (not `w-fit`); R-063: interactive cursor. R-062's
    // `touch-action: manipulation` and R-064's five 100ms transitions become
    // NSH's one 100ms `ease-out` transition.
    yearCell:
      "relative flex h-8 w-full items-center justify-center rounded-3xl px-2.5 text-sm font-medium text-foreground outline-none select-none cursor-pointer transition duration-100 ease-out motion-reduce:transition-none",
  },
  variants: {},
});

export type CalendarYearPickerVariants = VariantProps<typeof calendarYearPickerVariants>;
