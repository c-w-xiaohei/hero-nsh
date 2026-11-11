import { TableRoot } from "./table-root";
import type { JSX } from "nsh";
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
  TableLoadMoreContent,
  TableResizableContainer,
  TableRow,
  TableScrollContainer,
  TableSortableColumnHeader,
  type TablePartProps,
} from "./table-parts";

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

export type TableSortDirection = "ascending" | "descending";
export type TableScrollContainerProps = TablePartProps;
export type TableContentProps = TablePartProps & { selectionMode?: "none" | "single" | "multiple"; selectedKeys?: Iterable<string | number>; defaultSelectedKeys?: Iterable<string | number>; onSelectionChange?: (keys: "all" | Set<string>) => void; sortDescriptor?: { column: string; direction: TableSortDirection }; defaultSortDescriptor?: { column: string; direction: TableSortDirection }; onSortChange?: (descriptor: { column: string; direction: TableSortDirection }) => void; expandedKeys?: Iterable<string | number>; defaultExpandedKeys?: Iterable<string | number>; onExpandedChange?: (keys: Set<string>) => void; keyboardNavigationBehavior?: "tab" | "arrow"; "aria-label"?: string };
export type TableHeaderProps = TablePartProps & { columns?: Iterable<unknown> };
export type TableColumnProps = TablePartProps & { allowsSorting?: boolean; isRowHeader?: boolean; textValue?: string; width?: number | string; defaultWidth?: number | string; minWidth?: number; maxWidth?: number; focusMode?: string; allowsArrowNavigation?: boolean };
export type TableColumnResizerProps = TablePartProps & { "aria-label"?: string };
export type TableBodyProps = TablePartProps & { renderEmptyState?: (values: { isEmpty: () => boolean; isDropTarget: () => boolean }) => JSX.Element };
export type TableRowProps = TablePartProps & { value?: unknown; textValue?: string; isDisabled?: boolean; disabledBehavior?: "all" | "selection"; onAction?: () => void; hasChildItems?: boolean; href?: string };
export type TableCellProps = TablePartProps & { textValue?: string; colSpan?: number; focusMode?: string; allowsArrowNavigation?: boolean };
export type TableFooterProps = TablePartProps;
export type TableCollectionProps = TablePartProps;
export type TableLoadMoreProps = TablePartProps & { isLoading?: boolean; onLoadMore?: () => void; scrollOffset?: number };
export type TableLoadMoreContentProps = TablePartProps;
export type TableResizableContainerProps = TablePartProps & { onResizeStart?: (widths: Map<string, number>) => void; onResize?: (widths: Map<string, number>) => void; onResizeEnd?: (widths: Map<string, number>) => void };
export type TableSortableColumnHeaderProps = TablePartProps & { sortDirection?: TableSortDirection | (() => TableSortDirection | undefined); showIndicator?: boolean; indicator?: JSX.Element };
export type TableProps = TableRootProps;

export { TableRoot, TableScrollContainer, TableContent, TableHeader, TableColumn, TableColumnResizer, TableBody, TableRow, TableCell, TableFooter, TableCollection, TableLoadMore, TableLoadMoreContent, TableResizableContainer, TableSortableColumnHeader };
export { tableVariants, type TableVariants } from "./table.styles";
export { TableContext } from "./table-root";
export type { TableRootProps } from "./table-root";
export type { TablePartProps } from "./table-parts";
