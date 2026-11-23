import type { VariantProps } from "tailwind-variants";
import { tv } from "tailwind-variants";

/**
 * The Table slot table, mirroring `@heroui/styles` 3.2.7
 * `packages/styles/components/table.css` (port sheet §4). Static declarations
 * live here; every rule whose look depends on a position in the collection or
 * on an interaction state is a `classList` in the part that owns it (§4,
 * "为什么 classList 有 18 条").
 *
 * Two environment axes were added by the adapt sheet (A-001):
 *
 * - `input` owns interaction usability only: `touch` lifts the pressable
 *   slots (`cell`, `column`) to the 44 pt minimum hit height, and the
 *   `group-hover:` cell surfaces moved into `input: "pointer"` compound
 *   cells so a web sticky hover cannot keep them painted under touch.
 * - `density` owns visual spacing: the `py-*`/`px-4` literals of `column`,
 *   `cell`, `footer` and `loadMoreContent` moved out of the base slots into
 *   `density` cells (default keeps the port's exact values, compact
 *   tightens one step). A `density` axis in a component table needs a
 *   stated reason: every moved literal is a slot-class spacing value and
 *   `src/tokens/density.ts` registers only preset names — it has no
 *   spacing-token mapping exit (breadcrumbs A-002, same disposition).
 *
 * `treeColumn`'s `px-4`/`pe-4` stays put on purpose: it is coupled to the
 * tree-inset geometry contract, not ambient density (sheet A-001).
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
    // variant below (the tree column's start padding is inline, R-049);
    // `px-4`/`py-2.5` live in the `density` axis (A-001).
    column: "relative text-start text-xs font-medium text-muted",
    body: "",
    // R-033: the row's own border is inert upstream: HeroUI's table uses
    // `border-collapse: separate`, and a browser does not paint a border on a
    // table-row in that model, so the visible separator is each cell's (R-042).
    // The port therefore draws no row border; a cell then fills its row's box
    // exactly, which is the geometry the layout regression checks (G-002).
    row: "relative",
    // R-041 / R-042: cells are column flex containers (two stacked children
    // stay stacked) that carry the tertiary separator. `py-3` lives in the
    // `density` axis (A-001).
    cell: "flex flex-col justify-center bg-surface text-sm text-foreground border-b border-separator-tertiary/50",
    // R-050: footer layout. `px-4`/`py-2.5` live in the `density` axis (A-001).
    footer: "flex items-center",
    loadMore: "",
    // R-060: centered load-more content. `py-2` lives in the `density` axis (A-001).
    loadMoreContent: "mx-auto flex items-center justify-center gap-2",
    // R-025: sortable header aligns label and indicator.
    sortableColumnHeader: "flex items-center justify-between",
    // R-026: indicator size and transition.
    sortableColumnIndicator:
      "inline-grid size-3 place-content-center transition-transform duration-100 ease-out motion-reduce:transition-none",
    // R-052 / R-053: the resizer's inner 1px bar (the hit area around it is
    // transparent and carries the interaction classes as a classList). The bar
    // is absolute at the hit area's end and moves half its width out, so the
    // line stays on the column edge while the pressable box does not cross it.
    columnResizer:
      "pointer-events-none absolute end-0 top-1/2 h-4 w-px -translate-y-1/2 translate-x-1/2 rounded-sm bg-separator",
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
    // A-001: the `input` axis carries interaction usability — under `touch`
    // the row-level press surfaces (`cell`, `column`) grow to the 44 pt
    // minimum hit height; the `density` axis still owns how much vertical
    // room they have beyond it. `pointer` declares nothing.
    input: {
      pointer: {},
      touch: {
        cell: "min-h-11",
        column: "min-h-11",
      },
    },
    // A-001: the `density` axis owns the slot spacing literals. `default`
    // reproduces the port's values verbatim; `compact` tightens one step.
    density: {
      default: {
        column: "px-4 py-2.5",
        cell: "py-3",
        footer: "px-4 py-2.5",
        loadMoreContent: "py-2",
      },
      compact: {
        column: "px-4 py-2",
        cell: "py-2.5",
        footer: "px-4 py-2",
        loadMoreContent: "py-1.5",
      },
    },
  },
  compoundVariants: [
    // R-014: the secondary row's hover surface. A-001/A-006: a `group-hover:`
    // surface is a hover dependency, so under `input: "touch"` it must not
    // resolve at all — a web sticky hover would keep it painted after a press.
    { variant: "secondary", input: "pointer", class: { cell: "group-hover:bg-default/50" } },
    // R-035: the primary row's hover surface (same `input` gate).
    { variant: "primary", input: "pointer", class: { cell: "group-hover:bg-surface/40" } },
  ],
  defaultVariants: { variant: "primary", treeColumn: false, input: "pointer", density: "default" },
});

export type TableVariants = VariantProps<typeof tableVariants>;
