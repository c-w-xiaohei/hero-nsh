import { TableRoot } from "./table-root";
import type { TableRootProps } from "./table-root";
import {
  TableBody,
  TableCell,
  TableCollection,
  TableColumn,
  TableColumnResizer,
  TableContent,
  TableFooter,
  TableHeader,
  TableLoadMore,
  TableLoadMoreItem,
  TableLoadMoreContent,
  TableResizableContainer,
  TableRow,
  TableScrollContainer,
  TableSortableColumnHeader,
} from "./table-parts";
import type {
  TableBodyProps,
  TableCellProps,
  TableCollectionProps,
  TableColumnProps,
  TableColumnResizerProps,
  TableContentProps,
  TableFooterProps,
  TableHeaderProps,
  TableLoadMoreContentProps,
  TableLoadMoreProps,
  TableResizableContainerProps,
  TableRowProps,
  TableScrollContainerProps,
  TableSortableColumnHeaderProps,
} from "./table-parts";
import type { TableSortDescriptor } from "./create-table-state";

/** HeroUI's `Table`: the compound component, `Table.Part` and `TablePart`. */
export const Table = Object.assign(TableRoot, {
  Root: TableRoot,
  ScrollContainer: TableScrollContainer,
  Content: TableContent,
  Header: TableHeader,
  Column: TableColumn,
  ColumnResizer: TableColumnResizer,
  Body: TableBody,
  Row: TableRow,
  Cell: TableCell,
  Footer: TableFooter,
  Collection: TableCollection,
  LoadMore: TableLoadMore,
  LoadMoreContent: TableLoadMoreContent,
  ResizableContainer: TableResizableContainer,
  SortableColumnHeader: TableSortableColumnHeader,
});

/** The sort direction a sortable column reports (§1 events). */
export type TableSortDirection = TableSortDescriptor["direction"];

export type TableProps = TableRootProps;

export type Table = {
  Props: TableRootProps;
  RootProps: TableRootProps;
  ScrollContainerProps: TableScrollContainerProps;
  ContentProps: TableContentProps;
  HeaderProps: TableHeaderProps;
  ColumnProps: TableColumnProps;
  ColumnResizerProps: TableColumnResizerProps;
  BodyProps: TableBodyProps;
  RowProps: TableRowProps;
  CellProps: TableCellProps;
  FooterProps: TableFooterProps;
  CollectionProps: TableCollectionProps;
  LoadMoreProps: TableLoadMoreProps;
  LoadMoreContentProps: TableLoadMoreContentProps;
  ResizableContainerProps: TableResizableContainerProps;
  SortableColumnHeaderProps: TableSortableColumnHeaderProps;
};

export {
  TableRoot,
  TableScrollContainer,
  TableContent,
  TableHeader,
  TableColumn,
  TableColumnResizer,
  TableBody,
  TableRow,
  TableCell,
  TableFooter,
  TableCollection,
  TableLoadMore,
  TableLoadMoreItem,
  TableLoadMoreContent,
  TableResizableContainer,
  TableSortableColumnHeader,
};

export { tableVariants, type TableVariants } from "./table.styles";
export { TableContext } from "./table-context";
export type { TableRootProps } from "./table-root";
export type { TablePartProps } from "./table-props";
export type {
  TableScrollContainerProps,
  TableContentProps,
  TableHeaderProps,
  TableColumnProps,
  TableColumnResizerProps,
  TableBodyProps,
  TableRowProps,
  TableCellProps,
  TableFooterProps,
  TableCollectionProps,
  TableLoadMoreProps,
  TableLoadMoreContentProps,
  TableResizableContainerProps,
  TableSortableColumnHeaderProps,
};
export type { TableSortDescriptor } from "./create-table-state";

/** HeroUI's name for `TableLoadMore`'s props (the part is `TableLoadMoreItem`). */
export type { TableLoadMoreProps as TableLoadMoreItemProps };
