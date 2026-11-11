/*
 * The table's collection (port sheet §2, first row): Header's columns, Body's
 * rows and each row's cells register themselves, and this file flattens the
 * three registries into one model in display order. It is the counterpart of
 * `@react-stately/table`'s `TableCollection` (React Stately, tier R), adapted
 * to NSH: a parent cannot see its parts' JSX, so the parts register instead
 * (the ListBox registry, `src/components/list-box/list-box-context.ts`, one
 * level deeper and with rows that have parents).
 *
 * Focus keys. A focused view is either a column header or a cell, and both
 * live in the same focus store while selection works on row keys, so the two
 * kinds of keys are namespaced: a header's key is `\u0000column:<key>` and a
 * cell's is `\u0000cell:<rowKey>\u0001<index>`. The prefixes cannot collide
 * with a caller's keys because they start with a NUL byte.
 */

import type { Accessor, Signal, ViewRef } from "nsh";
import { computed, signal } from "nsh";

/** The prefix of a column header's focus key. */
export const COLUMN_FOCUS_PREFIX = "\u0000column:";

/** The prefix of a cell's focus key. */
export const CELL_FOCUS_PREFIX = "\u0000cell:";

/** The focus key of a column header. */
export function columnFocusKey(columnKey: string): string {
  return COLUMN_FOCUS_PREFIX + columnKey;
}

/** The focus key of the cell at `columnIndex` in `rowKey`. */
export function cellFocusKey(rowKey: string, columnIndex: number): string {
  return `${CELL_FOCUS_PREFIX}${rowKey}\u0001${columnIndex}`;
}

/** One registered column header (`Table.Column`). */
export interface TableColumnDescriptor {
  /** The collection key; `id` is an identity value, read once. */
  key: string;

  /** Registration order, used to put columns back into source order. */
  order: number;

  textValue: () => string;
  width: () => number | string | undefined;
  defaultWidth: () => number | string | undefined;
  minWidth: () => number | undefined;
  maxWidth: () => number | undefined;
  allowsSorting: () => boolean;
  isRowHeader: () => boolean;

  /** How many `Table.ColumnResizer`s registered under this column (R-057). */
  resizers: Signal<number>;

  /** The header view, for the focus that follows `focusedKey`. */
  ref: () => ViewRef | undefined;
}

/** One registered row (`Table.Row`). */
export interface TableRowDescriptor {
  key: string;
  order: number;
  /** The key of the row this one is nested in (a tree row). */
  parentKey: () => string | undefined;
  textValue: () => string;
  /** `Row.hasChildItems`, for a row whose children are not rendered yet. */
  hasChildItems: () => boolean | undefined;
  isDisabled: () => boolean;
  ref: () => ViewRef | undefined;
}

/** One registered cell (`Table.Cell`). */
export interface TableCellDescriptor {
  key: string;
  rowKey: string;
  /** The cell's starting column, from the row's own cell order. */
  columnIndex: number;
  colSpan: () => number;
  textValue: () => string;
  isRowHeader: () => boolean;
  ref: () => ViewRef | undefined;
}

/** The three registries the parts write into. */
export interface TableRegistry {
  columns: Accessor<readonly TableColumnDescriptor[]>;
  rows: Accessor<readonly TableRowDescriptor[]>;
  cells: Accessor<readonly TableCellDescriptor[]>;

  /** The built descriptor (with its resizer count) and the unregister. */
  registerColumn(
    descriptor: Omit<TableColumnDescriptor, "order" | "resizers">,
  ): { descriptor: TableColumnDescriptor; unregister: () => void };
  registerRow(descriptor: Omit<TableRowDescriptor, "order">): () => void;
  registerCell(descriptor: TableCellDescriptor): () => void;
}

/**
 * The registries. Every part registers once, in its body, and unregisters
 * through `cleanup` when its view goes away; `order` is the registration
 * sequence, which for static children is source order and for an `<Each>` is
 * the data order of its first render (rows are re-created by `<Each>` itself,
 * keyed by the item).
 */
export function createTableRegistry(): TableRegistry {
  const columns = signal<readonly TableColumnDescriptor[]>([]);
  const rows = signal<readonly TableRowDescriptor[]>([]);
  const cells = signal<readonly TableCellDescriptor[]>([]);

  let columnOrder = 0;
  let rowOrder = 0;

  return {
    columns,
    rows,
    cells,

    registerColumn(descriptor) {
      const full: TableColumnDescriptor = {
        ...descriptor,
        order: columnOrder++,
        resizers: signal(0),
      };

      columns.set([...columns(), full]);

      const unregister = () => {
        columns.set(columns().filter((current) => current !== full));
      };

      return { descriptor: full, unregister };
    },

    registerRow(descriptor) {
      const full: TableRowDescriptor = { ...descriptor, order: rowOrder++ };

      rows.set([...rows(), full]);

      return () => {
        rows.set(rows().filter((current) => current !== full));
      };
    },

    registerCell(descriptor) {
      cells.set([...cells(), descriptor]);

      return () => {
        cells.set(cells().filter((current) => current !== descriptor));
      };
    },
  };
}

/** One column of the built model. */
export interface TableColumnModel {
  key: string;
  index: number;
  textValue: string;
  width?: number | string;
  minWidth?: number;
  maxWidth?: number;
  allowsSorting: boolean;
  isRowHeader: boolean;
  isFirst: boolean;
  isLast: boolean;
  isOnly: boolean;
  hasResizer: boolean;
  ref?: ViewRef;
  descriptor: TableColumnDescriptor;
}

/** One cell of the built model. */
export interface TableCellModel {
  key: string;
  focusKey: string;
  rowKey: string;
  columnIndex: number;
  columnKey?: string;
  colSpan: number;
  isRowHeader: boolean;
  textValue: string;
  isFirstColumn: boolean;
  isLastColumn: boolean;
  ref?: ViewRef;
  descriptor: TableCellDescriptor;
}

/** One visible row of the built model. */
export interface TableRowModel {
  key: string;
  index: number;
  level: number;
  parentKey?: string;
  textValue: string;
  isDisabled: boolean;
  hasChildItems: boolean;
  isExpanded: boolean;
  isFirst: boolean;
  isLast: boolean;
  cells: TableCellModel[];
  ref?: ViewRef;
  descriptor: TableRowDescriptor;
}

/** The whole built table: columns, visible rows and their cells. */
export interface TableCollectionModel {
  columns: TableColumnModel[];
  rows: TableRowModel[];
  allRows: TableRowModel[];
  columnByKey: Map<string, TableColumnModel>;
  rowByKey: Map<string, TableRowModel>;
  cellByKey: Map<string, TableCellModel>;
  isEmpty: boolean;
}

export interface CreateTableCollectionProps {
  registry: TableRegistry;

  /** The expanded row keys; a collapsed row hides its subtree. */
  expandedKeys: Accessor<ReadonlySet<string>>;

  /** The keys that cannot be selected (`disabledKeys`). */
  disabledKeys: Accessor<ReadonlySet<string>>;
}

function byOrder<T extends { order: number }>(a: T, b: T): number {
  return a.order - b.order;
}

/**
 * The built model, as a `computed`: it follows the registries, `expandedKeys`
 * and `disabledKeys`, and every part that reads it in a render sees the same
 * value.
 */
export function createTableCollection(
  props: CreateTableCollectionProps,
): Accessor<TableCollectionModel> {
  return computed(() => {
    const columnDescriptors = [...props.registry.columns()].sort(byOrder);
    const rowDescriptors = [...props.registry.rows()].sort(byOrder);
    const cellDescriptors = props.registry.cells();
    const expandedKeys = props.expandedKeys();
    const disabledKeys = props.disabledKeys();

    const columns: TableColumnModel[] = columnDescriptors.map((descriptor, index) => ({
      key: descriptor.key,
      index,
      textValue: descriptor.textValue(),
      width: descriptor.width(),
      minWidth: descriptor.minWidth(),
      maxWidth: descriptor.maxWidth(),
      allowsSorting: descriptor.allowsSorting(),
      isRowHeader: descriptor.isRowHeader(),
      isFirst: index === 0,
      isLast: index === columnDescriptors.length - 1,
      isOnly: columnDescriptors.length === 1,
      hasResizer: descriptor.resizers() > 0,
      ref: descriptor.ref(),
      descriptor,
    }));

    const columnByKey = new Map(columns.map((column) => [column.key, column]));

    const cellsByRow = new Map<string, TableCellDescriptor[]>();

    for (const descriptor of cellDescriptors) {
      const list = cellsByRow.get(descriptor.rowKey);

      if (list) {
        list.push(descriptor);
      } else {
        cellsByRow.set(descriptor.rowKey, [descriptor]);
      }
    }

    const childrenOf = new Map<string | undefined, TableRowDescriptor[]>();

    for (const descriptor of rowDescriptors) {
      const parentKey = descriptor.parentKey();
      const list = childrenOf.get(parentKey);

      if (list) {
        list.push(descriptor);
      } else {
        childrenOf.set(parentKey, [descriptor]);
      }
    }

    const allRows: TableRowModel[] = [];
    const rows: TableRowModel[] = [];

    const describe = (
      descriptor: TableRowDescriptor,
      index: number,
      level: number,
      parentKey: string | undefined,
    ): TableRowModel => {
      const children = childrenOf.get(descriptor.key) ?? [];
      const isExpanded = expandedKeys.has(descriptor.key);
      const rowCells = (cellsByRow.get(descriptor.key) ?? [])
        .slice()
        .sort((a, b) => a.columnIndex - b.columnIndex);
      const lastColumn = columns.length - 1;

      const cells: TableCellModel[] = rowCells.map((cell, position) => {
        const colSpan = Math.max(1, cell.colSpan());
        const columnKey = columns[cell.columnIndex]?.key;

        return {
          key: cell.key,
          focusKey: cellFocusKey(descriptor.key, cell.columnIndex),
          rowKey: descriptor.key,
          columnIndex: cell.columnIndex,
          columnKey,
          colSpan,
          isRowHeader: cell.isRowHeader(),
          textValue: cell.textValue(),
          isFirstColumn: cell.columnIndex === 0,
          isLastColumn: cell.columnIndex + colSpan - 1 >= lastColumn,
          ref: cell.ref(),
          descriptor: cell,
        };
      });

      // The row's text: its own `textValue`, else the first cell that carries
      // text (a row's children are cells, whose own text is what the caller
      // wrote inside them).
      const textValue =
        descriptor.textValue() ||
        cells.find((cell) => cell.textValue.length > 0)?.textValue ||
        "";

      return {
        key: descriptor.key,
        index,
        level,
        parentKey,
        textValue,
        isDisabled: descriptor.isDisabled() || disabledKeys.has(descriptor.key),
        hasChildItems: children.length > 0 || descriptor.hasChildItems() === true,
        isExpanded,
        isFirst: false,
        isLast: false,
        cells,
        ref: descriptor.ref(),
        descriptor,
      };
    };

    const walk = (parentKey: string | undefined, level: number) => {
      for (const descriptor of childrenOf.get(parentKey) ?? []) {
        const row = describe(descriptor, allRows.length, level, parentKey);

        allRows.push(row);
        rows.push(row);

        if (row.hasChildItems && row.isExpanded) {
          walk(descriptor.key, level + 1);
        }
      }
    };

    walk(undefined, 1);

    rows.forEach((row, index) => {
      row.index = index;
      row.isFirst = index === 0;
      row.isLast = index === rows.length - 1;
    });

    const rowByKey = new Map(rows.map((row) => [row.key, row]));
    const cellByKey = new Map<string, TableCellModel>();

    for (const row of rows) {
      for (const cell of row.cells) {
        cellByKey.set(cell.focusKey, cell);
      }
    }

    return {
      columns,
      rows,
      allRows,
      columnByKey,
      rowByKey,
      cellByKey,
      isEmpty: rows.length === 0,
    };
  });
}
