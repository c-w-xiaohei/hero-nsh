import type { VariantProps } from "tailwind-variants";

import { tv } from "tailwind-variants";

/**
 * RangeCalendar's slots mirror HeroUI 3.2.7's `rangeCalendarVariants` (same
 * twelve slot names in the same order, no variant axes) with the CSS block's
 * declarations expanded into NSH classes (port sheet §4). The state rules live
 * in the parts that own the state; every rule of §4 with destination 变体类 is
 * marked here, and the ones that belong to a part are marked there.
 */
export const rangeCalendarVariants = tv({
  defaultVariants: {},
  slots: {
    // R-001: root `w-63 max-w-63` (252px). A caller's `className` still wins.
    // R-051: the root is always the year panel's containing block, so
    // `relative` is unconditional (upstream adds it through `:has()`).
    // The root also carries the inherited foreground the CSS gets from the
    // page; NSH has no CSS-variable cascade.
    // R-002: `container-type: inline-size` has no NSH equivalent (no container
    // queries, no subtree container units).
    base: "relative w-63 max-w-63 text-foreground",
    // R-025: the cell track (upstream's `div.range-calendar__cell`); `my-0.5`
    // is 2px, which makes a 36px cell a 40px row (G-001). `w-full` per §4c: the
    // track fills its column, since NSH has no `td` to inherit the width from.
    // R-026: interactive cursor.
    // R-027: `will-change`, the box-shadow/border-color transitions and
    // `transform-gpu` are deleted (no multi-property transition, no motion in
    // this phase).
    cell: "relative z-1 my-0.5 w-full rounded-3xl p-0 outline-none cursor-pointer",
    // R-049: the dot under a selected day.
    cellIndicator: "absolute bottom-1 left-1/2 size-[3px] -translate-x-1/2 rounded-xs bg-muted",
    // R-019: upstream's `table` becomes a column container whose header and
    // every row are their own seven-column grids (§4c).
    grid: "flex w-full flex-col",
    // R-022: the body is a column of row views; upstream's first-row 4px top
    // spacing (month view `tr:first-child > td { mt-1 }`, day view body
    // `mt-1`) is one gap above the whole body.
    gridBody: "mt-1 flex w-full flex-col",
    // R-006/R-021: the header row is a real seven-column grid; there is no
    // `display: contents` to make it transparent.
    gridHeader: "grid w-full grid-cols-7",
    // R-023: every row is a real seven-column grid.
    gridRow: "grid w-full grid-cols-7",
    // R-008: header layout (252x40: 2px sides, 24px content, 16px bottom).
    header: "flex flex-row items-center justify-between px-0.5 pb-4",
    // R-024: header cell; `min-w-0` plus `truncate` keep long labels inside
    // their column instead of widening it.
    headerCell: "block min-w-0 truncate pb-2 text-center text-xs font-medium text-muted",
    // R-010: the heading takes the free width; the header's width is fixed, so
    // `flex-1`'s zero basis does not collapse (§4c).
    heading: "flex-1 text-sm font-medium text-foreground",
    // R-011: nav button shape and color — `rounded-xl`, unlike Calendar's
    // `rounded-2xl`. R-013: interactive cursor. R-014: hover paint. R-015:
    // pressed scale. R-009's fade while the year panel is open is state, so it
    // stays in the NavButton part. R-012: the four transitions, `will-change`
    // and `transform-gpu` are deleted; state changes instantly.
    navButton:
      "flex size-6 items-center justify-center rounded-xl text-accent-soft-foreground cursor-pointer hover:bg-default hover:text-accent-soft-foreground active:scale-[0.95]",
    // R-018: chevron size, mirrored in right-to-left locales.
    navButtonIcon: "size-4 rtl:rotate-180",
  },
  variants: {},
});

export type RangeCalendarVariants = VariantProps<typeof rangeCalendarVariants>;
