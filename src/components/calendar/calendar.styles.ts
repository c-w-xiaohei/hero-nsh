import type { VariantProps } from "tailwind-variants";

import { tv } from "tailwind-variants";

/**
 * Calendar's slots mirror HeroUI 3.2.7's `calendarVariants` (same slot names,
 * no variant axes) with the CSS block's declarations expanded into NSH
 * classes. Every rule of port-sheet §4.1 is marked at the slot it lands in;
 * the state rules live in the parts that own the state.
 */
export const calendarVariants = tv({
  defaultVariants: {},
  slots: {
    // R-001: root `w-63 max-w-63` (252px); R-042: the year panel's
    // positioning context is always `relative`.
    // The root carries the inherited `foreground` the CSS gets from the page;
    // NSH has no CSS-variable cascade, so every child Text would otherwise fall
    // back to its default grey. R-002's `container-type: inline-size` has no NSH
    // equivalent (there are no container queries here).
    base: "relative w-63 max-w-63 text-foreground",
    // R-008: header layout.
    header: "flex flex-row items-center justify-between px-0.5 pb-4",
    // R-010: heading takes the free width, on the inherited foreground.
    heading: "flex-1 text-sm font-medium text-foreground",
    // R-011: nav button shape and color; R-013: interactive cursor.
    // R-012: transform 250ms, background/box-shadow 100ms, opacity 150ms.
    // NSH takes one property set, duration and curve, so the four become one
    // 250ms `ease-out` transition; `will-change: scale` has no NSH equivalent.
    navButton:
      "flex size-6 items-center justify-center rounded-2xl text-accent-soft-foreground cursor-pointer transition duration-[250ms] ease-out motion-reduce:transition-none",
    // R-018: chevron size; mirrored on the right-to-left layout.
    navButtonIcon: "size-4 rtl:rotate-180",
    // R-005/R-019: the upstream table becomes a column container whose
    // header and every row are their own seven-column grid.
    grid: "flex w-full flex-col",
    // R-006/R-021: header row is a real seven-column grid.
    gridHeader: "grid w-full grid-cols-7",
    // R-007/R-022: body is a column of row views; the first row's 4px top
    // spacing (month view's `tr:first-child > td { mt-1 }`, day view's body
    // `mt-1`) is one gap above the whole body.
    gridBody: "mt-1 flex w-full flex-col",
    // R-023: every row is a real seven-column grid.
    gridRow: "grid w-full grid-cols-7",
    // R-024: header cell; `min-w-0` plus `truncate` keep long labels inside
    // their column instead of widening it.
    headerCell: "block min-w-0 truncate pb-2 text-center text-xs font-medium text-muted",
    // R-025: cell button; R-027: interactive cursor. `size-full` is replaced
    // by `w-full` + `aspect-square` because a grid item's width comes from its
    // track (4c). R-026's transform 250ms and box-shadow 100ms cannot coexist
    // in NSH's single transition; the press scale keeps its 250ms `ease-out`
    // and the focus-ring shadow appears without a transition, so hover colors
    // stay instant as upstream intends. `will-change: scale` has no NSH
    // equivalent.
    cell:
      "relative flex aspect-square w-full items-center justify-center rounded-3xl text-center text-sm font-medium text-foreground outline-none cursor-pointer transition-transform duration-[250ms] ease-out motion-reduce:transition-none",
    // R-039: today/selected dot.
    cellIndicator: "absolute bottom-1 left-1/2 size-[3px] -translate-x-1/2 rounded-xs bg-muted",
  },
  variants: {},
});

export type CalendarVariants = VariantProps<typeof calendarVariants>;
