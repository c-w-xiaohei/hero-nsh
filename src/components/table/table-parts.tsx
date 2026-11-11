/**
 * The parts of the table, re-exported in one place so the barrel keeps a
 * single import per part. Each is a real component, usable as `Table.<Part>`
 * and as the named `<Part>` export (HeroUI exports both).
 */
export { TableContent } from "./table-content";
export type { TableContentProps } from "./table-content";

export { TableHeader } from "./table-header";
export type { TableHeaderProps } from "./table-header";

export { TableColumn } from "./table-column";
export type { TableColumnProps } from "./table-column";

export { TableColumnResizer } from "./table-column-resizer";
export type { TableColumnResizerProps } from "./table-column-resizer";

export { TableBody } from "./table-body";
export type { TableBodyProps } from "./table-body";

export { TableRow } from "./table-row";
export type { TableRowProps } from "./table-row";

export { TableCell } from "./table-cell";
export type { TableCellProps } from "./table-cell";

export { TableFooter } from "./table-footer";
export type { TableFooterProps } from "./table-footer";

export { TableCollection } from "./table-collection";
export type { TableCollectionProps } from "./table-collection";

export { TableLoadMore, TableLoadMoreItem, TableLoadMoreContent } from "./table-load-more";
export type {
  TableLoadMoreContentProps,
  TableLoadMoreProps,
} from "./table-load-more";

export { TableResizableContainer } from "./table-resizable-container";
export type { TableResizableContainerProps } from "./table-resizable-container";

export { TableScrollContainer } from "./table-scroll-container";
export type { TableScrollContainerProps } from "./table-scroll-container";

export { TableSortableColumnHeader } from "./table-sortable-column-header";
export type { TableSortableColumnHeaderProps } from "./table-sortable-column-header";

export type { TablePartProps } from "./table-props";
