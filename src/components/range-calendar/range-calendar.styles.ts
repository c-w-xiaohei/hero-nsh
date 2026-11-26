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
  defaultVariants: {
    input: "pointer",
  },
  slots: {
    // R-001: root width (`w-63 max-w-63`, 252px) lives in the `input` axis
    // (A-001). A caller's `className` still wins. R-051: the root is always
    // the year panel's containing block, so `relative` is unconditional
    // (upstream adds it through `:has()`).
    // The root also carries the inherited foreground the CSS gets from the
    // page; NSH has no CSS-variable cascade.
    // R-002: `container-type: inline-size` has no NSH equivalent (no container
    // queries, no subtree container units).
    base: "relative text-foreground",
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
    // `rounded-2xl`. R-013: interactive cursor. R-015: pressed scale. R-009's
    // fade while the year panel is open is state, so it stays in the NavButton
    // part. R-012: the four transitions, `will-change` and `transform-gpu`
    // are deleted; state changes instantly.
    // The 24pt size and R-014's two hover paints live in the `input` axis
    // (A-001): a touch host needs the 44pt target and cannot keep a sticky
    // `hover:` class on the button after a press.
    navButton:
      "flex items-center justify-center rounded-xl text-accent-soft-foreground cursor-pointer active:scale-[0.95]",
    // R-018: chevron size, mirrored in right-to-left locales.
    navButtonIcon: "size-4 rtl:rotate-180",
  },
  variants: {
    // A-001: the `input` axis of the encapsulation model — interaction
    // usability only. `pointer` keeps the desktop table byte-for-byte (the
    // root's 252px width and the nav button's 24pt box with its two hover
    // paints, moved out of the slots so touch never resolves them); `touch`
    // widens the root to 7 × 44pt columns — the date cell's minimum hit width
    // goes through the visible-size path, the `aspect-square w-full` track
    // sharing the root's 308px — and grows the nav button to the 44pt target
    // so its `hitSlop` expansion never reaches into the heading row. No
    // `density` axis: the table carries no spacing/type content a density
    // preset resolves, and 44pt is the hit minimum, not a spacing preset.
    input: {
      pointer: {
        base: "w-63 max-w-63",
        navButton: "size-6 hover:bg-default hover:text-accent-soft-foreground",
      },
      touch: {
        base: "w-77 max-w-77",
        navButton: "size-11",
      },
    },
  },
});

export type RangeCalendarVariants = VariantProps<typeof rangeCalendarVariants>;
