import type { Accessor, JSX, PressEvent } from "nsh";
import { context } from "nsh";

import type { InteractionModalityState } from "../../primitives";
import type { TableColumnLayoutState, TableResizeCallbacks } from "./create-table-column-layout";
import type { TableRegistry } from "./create-table-collection";
import type { TableState } from "./create-table-state";
import type { tableVariants } from "./table.styles";

/**
 * What `Table.Root` provides: the variant and its slot classes (port sheet §2,
 * "TableContext（Root 的 15 个 slot 类）"). Root owns nothing else.
 */
export interface TableSlotContextValue {
  variant: Accessor<"primary" | "secondary">;
  slots: Accessor<ReturnType<typeof tableVariants>>;
}

export const TableContext = context<TableSlotContextValue | undefined>(undefined);

/**
 * What the scroll containers provide: the viewport the load-more sentinel is
 * measured against (§2 "scrollOffset / 哨兵可见性"). A `Table.Content` without
 * one (a page-level scroll) has no viewport of its own.
 */
export interface TableViewportContextValue {
  height: Accessor<number | undefined>;
  width: Accessor<number | undefined>;
  offsetY: Accessor<number>;
  /** `Table.ResizableContainer`: its width drives the column layout. */
  resizable: Accessor<boolean>;

  /**
   * `Table.ResizableContainer`'s `onResize*` callbacks. The container renders
   * above `Table.Content` (the state owner), so it cannot reach the layout from
   * the state context; it hands the callbacks down here and Content registers
   * them with `layout` (§1 events, `onResizeStart` / `onResize` / `onResizeEnd`).
   */
  resizeCallbacks?: Accessor<TableResizeCallbacks | undefined>;
}

export const TableViewportContext = context<TableViewportContextValue | undefined>(
  undefined,
);

/**
 * What `Table.Content` provides: the whole table state, the column layout, the
 * interaction modality and the helpers the parts need from their parent.
 */
export interface TableStateContextValue {
  state: TableState;
  layout: TableColumnLayoutState;
  modality: InteractionModalityState;
  isKeyboard: Accessor<boolean>;

  /** The registries the Row / Column / Cell parts write into. */
  registry: TableRegistry;

  /** `tableColumn` from `Table.Content`: the column whose cells indent (R-049). */
  treeColumn: Accessor<string | undefined>;

  /** `Table.Content`'s `onRowAction`, reported by a row that cannot be selected. */
  onRowAction: (rowKey: string) => void;

  /** Focuses the grid view itself (`keyboardNavigationBehavior: "arrow"`). */
  focusGrid: () => void;

  /** The body's offset inside the content, for the load-more sentinel. */
  bodyOffsetY: Accessor<number>;
  registerBodyLayout: (offsetY: number) => void;
}

export const TableStateContext = context<TableStateContextValue | undefined>(undefined);

/** What `Table.Column` provides to its `ColumnResizer` and `SortableColumnHeader`. */
export interface TableColumnContextValue {
  columnKey: string;
  index: Accessor<number>;
  sortDirection: Accessor<"ascending" | "descending" | undefined>;
  startResize: () => void;

  /**
   * Registers a resizer under the column; R-057 hides the divider while one
   * exists. `focus` is what the column's `startResize` render value calls.
   */
  registerResizer: (focus?: () => void) => () => void;
}

export const TableColumnContext = context<TableColumnContextValue | undefined>(
  undefined,
);

/** What `Table.Row` provides to its cells and to the rows nested inside it. */
export interface TableRowContextValue {
  rowKey: string;
  level: number;

  /** The next cell's column index, in the row's own cell order. */
  nextCellIndex: () => number;
}

export const TableRowContext = context<TableRowContextValue | undefined>(undefined);

/** The render values `Table.Column`'s children / className / style receive (§1). */
export interface TableColumnRenderProps {
  isHovered: Accessor<boolean>;
  isPressed: Accessor<boolean>;
  isFocused: Accessor<boolean>;
  isFocusVisible: Accessor<boolean>;
  allowsSorting: Accessor<boolean>;
  sortDirection: Accessor<"ascending" | "descending" | undefined>;
  isResizing: Accessor<boolean>;
  sort: (direction?: "ascending" | "descending") => void;
  startResize: () => void;
}

/** The render values `Table.Row`'s children / className / style receive (§1). */
export interface TableRowRenderProps {
  isSelected: Accessor<boolean>;
  isDisabled: Accessor<boolean>;
  isPressed: Accessor<boolean>;
  isHovered: Accessor<boolean>;
  isFocused: Accessor<boolean>;
  isFocusVisible: Accessor<boolean>;
  isFocusVisibleWithin: Accessor<boolean>;
  selectionMode: Accessor<"none" | "single" | "multiple">;
  selectionBehavior: Accessor<"toggle" | "replace">;
  isDragging: Accessor<undefined>;
  isDropTarget: Accessor<undefined>;
  id: string;
  isExpanded: Accessor<boolean>;
  hasChildItems: Accessor<boolean>;
  level: Accessor<number>;
  state: TableState;
}

/** The render values `Table.Cell`'s children / className / style receive (§1). */
export interface TableCellRenderProps {
  isSelected: Accessor<boolean>;
  isDisabled: Accessor<boolean>;
  isPressed: Accessor<boolean>;
  isHovered: Accessor<boolean>;
  isFocused: Accessor<boolean>;
  isFocusVisible: Accessor<boolean>;
  isFocusVisibleWithinRow: Accessor<boolean>;
  id: string;
  columnIndex: number;
  isTreeColumn: Accessor<boolean>;
  isExpanded: Accessor<boolean>;
  hasChildItems: Accessor<boolean>;
  level: Accessor<number>;
}

/** The render values `Table.Content`, `Header` and `Body` receive (§1). */
export interface TableContentRenderProps {
  isFocused: Accessor<boolean>;
  isFocusVisible: Accessor<boolean>;
  isDropTarget: Accessor<boolean>;
  state: TableState;
}

export interface TableHeaderRenderProps {
  isHovered: Accessor<boolean>;
}

export interface TableBodyRenderProps {
  isEmpty: Accessor<boolean>;
  isDropTarget: Accessor<boolean>;
}

/**
 * A press is heard by the pressed view and, as it bubbles, by the views around
 * it (the ListBox root ignores pointer presses for exactly this reason). A
 * cell and its row both act on a press, so whichever handler runs first claims
 * the event and the other skips it.
 */
const claimedPresses = new WeakSet<object>();

/** Whether this press was already handled by a view inside the caller. */
export function claimPress(event: PressEvent): boolean {
  if (claimedPresses.has(event)) {
    return false;
  }

  claimedPresses.add(event);

  return true;
}

/** A press payload a part may receive, for the handlers that forward one. */
export type TablePressHandler = (event: PressEvent) => void;

/** The children value of a part: an element tree or a render function (§1). */
export type TableChildren<Values = unknown> =
  | JSX.Element
  | ((values: Values) => JSX.Element);
