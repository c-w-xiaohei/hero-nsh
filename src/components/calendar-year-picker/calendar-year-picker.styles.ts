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
    // R-045: trigger layout; R-046: interactive cursor.
    trigger: "flex flex-1 items-center justify-start gap-1 rounded-lg outline-none cursor-pointer",
    // R-049: heading typography; R-054's open color is context-driven.
    triggerHeading: "text-sm font-medium",
    // R-051: indicator typography; the open rotation is context-driven (R-053).
    triggerIndicator: "text-xs text-accent-soft-foreground rtl:rotate-180",
    // R-055: overlay box; opening/closing paint follows the open state.
    yearGrid: "absolute inset-x-0 pointer-events-none opacity-0",
    // R-061: a grid item is blockified and stretched to its column, so the
    // button is `w-full` (not `w-fit`); R-063: interactive cursor.
    yearCell:
      "relative flex h-8 w-full items-center justify-center rounded-3xl px-2.5 text-sm font-medium text-default-foreground outline-none select-none cursor-pointer",
  },
  variants: {},
});

export type CalendarYearPickerVariants = VariantProps<typeof calendarYearPickerVariants>;
