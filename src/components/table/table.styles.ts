import type { VariantProps } from "tailwind-variants";
import { tv } from "tailwind-variants";

/** HeroUI 3.2.7 table slots, translated from the rules in port sheet §4. */
export const tableVariants = tv({
  slots: {
    // R-001: root grid establishes a hard width boundary.
    // R-004: primary surface, inset and 20px radius (theme calculation is fixed per §8).
    base: "relative grid w-full grid-cols-[minmax(0,1fr)] overflow-hidden bg-surface-secondary px-1 pb-1 rounded-[20px]",
    // R-002 uses Scroll; R-003 scrollbar-gutter has no NSH equivalent.
    scrollContainer: "",
    // R-015: content fills width and uses the upstream text size.
    // R-016: primary content clips to its card radius.
    content: "w-full text-sm overflow-hidden",
    // R-017: table header surface and separator.
    header: "border-b border-separator/50 bg-surface-secondary",
    // R-018: column header typography and positioning.
    column: "relative px-4 py-2.5 text-start text-xs font-medium text-muted",
    columnResizer: "",
    body: "",
    // R-033: rows carry the separator; row height follows content.
    row: "relative border-b border-separator/50",
    // R-041: cells are vertical flex containers to preserve stacked content.
    // R-042: cells carry the tertiary separator.
    cell: "flex flex-col justify-center bg-surface py-3 text-sm text-foreground border-b border-separator-tertiary/50",
    // R-050: footer layout.
    footer: "flex items-center px-4 py-2.5",
    loadMore: "",
    // R-060: centered load-more content.
    loadMoreContent: "mx-auto flex items-center justify-center gap-2 py-2",
    // R-025: sortable header aligns label and indicator.
    sortableColumnHeader: "flex items-center justify-between",
    // R-026: sortable indicator size and transition.
    sortableColumnIndicator: "inline-grid size-3 place-content-center transition-transform duration-100 ease-out motion-reduce:transition-none",
  },
  variants: {
    variant: {
      primary: {},
      // R-005: secondary has no root declarations.
      secondary: {
        // R-006: remove header bottom border and surface.
        header: "border-b-0 bg-transparent",
        // R-007: columns sit on the secondary surface.
        column: "bg-surface-secondary",
        // R-013: secondary cell separator and transparent surface.
        cell: "border-b border-separator-tertiary/50 bg-transparent",
      },
    },
    treeColumn: {
      false: { cell: "px-4" },
      // R-049: inline padding owns the tree column start inset; class owns only end.
      true: { cell: "pe-4" },
    },
  },
  compoundVariants: [
    // R-014: secondary cell hover surface.
    { variant: "secondary", class: { cell: "group-hover:bg-default/50" } },
    // R-035: primary cell hover surface.
    { variant: "primary", class: { cell: "group-hover:bg-surface/40" } },
  ],
  defaultVariants: { variant: "primary", treeColumn: false },
});

export type TableVariants = VariantProps<typeof tableVariants>;
