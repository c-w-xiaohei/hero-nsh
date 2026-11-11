import type { VariantProps } from "tailwind-variants";

import { tv } from "tailwind-variants";

/**
 * CalendarYearPicker's slots mirror HeroUI 3.2.7's variant table, expanded
 * with the CSS declarations listed in the port sheet. Context-driven states
 * are applied by their owning parts.
 */
export const calendarYearPickerVariants = tv({
  slots: {
    // R-004: Trigger layout and shape; R-006's focus style belongs to the part.
    trigger: "flex flex-1 items-center justify-start gap-1 rounded-lg outline-none",
    // R-007: Heading typography; R-012's open color is context-driven.
    triggerHeading: "text-sm font-medium",
    // R-009: Indicator typography and RTL direction; R-011's open rotation is context-driven.
    triggerIndicator: "text-xs text-accent-soft-foreground rtl:rotate-180",
    // R-013: Overlay geometry and scroll structure; R-014: three equal columns.
    yearGrid: "pointer-events-none absolute inset-x-0 grid grid-cols-3 content-start gap-1 overflow-y-auto p-1 opacity-0",
    // R-016: A content-sized year button; w-fit preserves upstream inline-flex sizing in NSH.
    yearCell: "relative inline-flex w-fit h-8 items-center justify-center rounded-3xl px-2.5 text-sm font-medium outline-none select-none",
  },
});

export type CalendarYearPickerVariants = VariantProps<typeof calendarYearPickerVariants>;
