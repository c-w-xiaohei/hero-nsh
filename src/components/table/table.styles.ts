import type { VariantProps } from "tailwind-variants";
import { tv } from "tailwind-variants";

/**
 * The Table slot table, mirroring `@heroui/styles` 3.2.7
 * `packages/styles/components/table.css` (port sheet §4). Static declarations
 * live here; every rule whose look depends on a position in the collection or
 * on an interaction state is a `classList` in the part that owns it (§4,
 * "为什么 classList 有 18 条").
 */
export const tableVariants = tv({
  slots: {
    // R-001: the root grid with a hard width boundary; overflow-clip is
    // `overflow: hidden` in NSH (the skill's §5).
    base: "relative grid w-full grid-cols-[minmax(0,1fr)] overflow-hidden",
    // R-002 / R-051: the Scroll hosts own overflow and the scrollbar; the
    // slots carry nothing of their own (R-051 keeps `relative`, which the
    // hit area of a resizer is positioned against).
    scrollContainer: "",
    resizableContainer: "relative",
    // R-015: full width, upstream's 0.875rem text size. `border-separate` /
    // `border-spacing` are table-model products with no grid equivalent.
    content: "w-full text-sm",
    // R-017: header surface and separator.
    header: "border-b border-separator/50 bg-surface-secondary",
    // R-018: column typography. Horizontal padding comes from the treeColumn
    // variant below (the tree column's start padding is inline, R-049).
    column: "relative px-4 py-2.5 text-start text-xs font-medium text-muted",
    body: "",
    // R-033: the row's own border is inert upstream: HeroUI's table uses
    // `border-collapse: separate`, and a browser does not paint a border on a
    // table-row in that model, so the visible separator is each cell's (R-042).
    // The port therefore draws no row border; a cell then fills its row's box
    // exactly, which is the geometry the layout regression checks (G-002).
    row: "relative",
    // R-041 / R-042: cells are column flex containers (two stacked children
    // stay stacked) that carry the tertiary separator.
    cell: "flex flex-col justify-center bg-surface py-3 text-sm text-foreground border-b border-separator-tertiary/50",
    // R-050: footer layout.
    footer: "flex items-center px-4 py-2.5",
    loadMore: "",
    // R-060: centered load-more content.
    loadMoreContent: "mx-auto flex items-center justify-center gap-2 py-2",
    // R-025: sortable header aligns label and indicator.
    sortableColumnHeader: "flex items-center justify-between",
    // R-026: indicator size and transition.
    sortableColumnIndicator:
      "inline-grid size-3 place-content-center transition-transform duration-100 ease-out motion-reduce:transition-none",
    // R-052 / R-053: the resizer's inner 1px bar (the hit area around it is
    // transparent and carries the interaction classes as a classList).
    columnResizer: "pointer-events-none mx-auto h-4 w-px rounded-sm bg-separator",
  },
  variants: {
    variant: {
      // R-004: primary is the gray surface with the white card inside it.
      // `min(32px, radius * 2.5)` cannot follow the theme in a class, so the
      // default radius is written out (registered in §8).
      primary: {
        base: "bg-surface-secondary px-1 pb-1 rounded-[20px]",
        // R-016: the primary card's radius clips the cells.
        content: "overflow-hidden",
      },
      // R-005: secondary declares nothing on the root; its parts move the
      // surface to the header (R-006) and the columns (R-007).
      secondary: {
        header: "border-b-0 bg-transparent",
        column: "bg-surface-secondary",
        // R-013: transparent cells with the tertiary separator.
        cell: "border-b border-separator-tertiary/50 bg-transparent",
      },
    },
    treeColumn: {
      false: { cell: "px-4" },
      // R-049: the tree column's start inset is the inline style; the class
      // keeps only the end padding (one owner per property).
      true: { cell: "pe-4" },
    },
  },
  compoundVariants: [
    // R-014: the secondary row's hover surface.
    { variant: "secondary", class: { cell: "group-hover:bg-default/50" } },
    // R-035: the primary row's hover surface.
    { variant: "primary", class: { cell: "group-hover:bg-surface/40" } },
  ],
  defaultVariants: { variant: "primary", treeColumn: false },
});

export type TableVariants = VariantProps<typeof tableVariants>;
