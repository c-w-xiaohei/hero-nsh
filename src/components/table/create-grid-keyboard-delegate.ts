/*
 * The table's keyboard delegate (port sheet §2, focus row; §5 "键盘的两个
 * 作用域"): the two-dimensional counterpart of
 * `@react-aria/grid`'s `GridKeyboardDelegate` (React Aria, tier R), rewritten
 * against the built model instead of measured elements.
 *
 * React Aria asks the DOM for each cell's `parentElement` / `nextElementSibling`
 * and the row group's geometry. Here the model already knows the row order, each
 * row's cells and their `colSpan`, and the page keys use the row layouts the
 * rows report through `onLayout` plus the viewport height the scroll container
 * reports. That is the whole geometric contract.
 */

import type { Accessor } from "nsh";

import type {
  TableCellModel,
  TableCollectionModel,
  TableColumnModel,
  TableRowModel,
} from "./create-table-collection";
import {
  CELL_FOCUS_PREFIX,
  COLUMN_FOCUS_PREFIX,
  cellFocusKey,
  columnFocusKey,
} from "./create-table-collection";
import type { KeyboardDelegate } from "../../primitives";

interface FocusTarget {
  kind: "column";
  column: TableColumnModel;
}

interface FocusCellTarget {
  kind: "cell";
  row: TableRowModel;
  cell: TableCellModel;
}

type ParsedKey = FocusTarget | FocusCellTarget;

export interface GridKeyboardDelegateOptions {
  /** One row's frame, reported by `Table.Row`'s `onLayout`. */
  getRowLayout?: (rowKey: string) => { y: number; height: number } | undefined;

  /** The viewport height, reported by the scroll container around the grid. */
  getContainerHeight?: () => number | undefined;
}

export class GridKeyboardDelegate implements KeyboardDelegate {
  private model: Accessor<TableCollectionModel>;
  private options: GridKeyboardDelegateOptions;

  constructor(
    model: Accessor<TableCollectionModel>,
    options: GridKeyboardDelegateOptions = {},
  ) {
    this.model = model;
    this.options = options;
  }

  /** The column index a key points at, for a cell or a header. */
  private columnIndexOf(key: string): number | undefined {
    const parsed = this.parse(key);

    if (!parsed) {
      return;
    }

    return parsed.kind === "column"
      ? parsed.column.index
      : parsed.cell.columnIndex;
  }

  private parse(key: string): ParsedKey | undefined {
    const model = this.model();

    if (key.startsWith(COLUMN_FOCUS_PREFIX)) {
      const column = model.columnByKey.get(key.slice(COLUMN_FOCUS_PREFIX.length));

      return column ? { kind: "column", column } : undefined;
    }

    if (!key.startsWith(CELL_FOCUS_PREFIX)) {
      return undefined;
    }

    const rest = key.slice(CELL_FOCUS_PREFIX.length);
    const separator = rest.lastIndexOf("\u0001");

    if (separator < 0) {
      return undefined;
    }

    const rowKey = rest.slice(0, separator);
    const columnIndex = Number(rest.slice(separator + 1));
    const row = model.rowByKey.get(rowKey);

    if (!row) {
      return undefined;
    }

    const cell = row.cells.find((candidate) => candidate.columnIndex === columnIndex);

    return cell ? { kind: "cell", row, cell } : undefined;
  }

  private rowKeyOf(key: string): string | undefined {
    const parsed = this.parse(key);

    return parsed?.kind === "cell" ? parsed.row.key : undefined;
  }

  /** The cell of `row` that holds column `index`, or its nearest cell inside the row. */
  private cellAt(row: TableRowModel, index: number): TableCellModel | undefined {
    let fallback: TableCellModel | undefined;

    for (const cell of row.cells) {
      if (cell.columnIndex <= index) {
        fallback = cell;
      }

      if (cell.columnIndex === index) {
        return cell;
      }

      if (cell.columnIndex + cell.colSpan > index) {
        // `index` is inside a spanning cell: land on that cell.
        return cell;
      }
    }

    return fallback ?? row.cells[0];
  }

  private cellKey(row: TableRowModel, cell: TableCellModel): string {
    return cellFocusKey(row.key, cell.columnIndex);
  }

  /** The row before or after `rowKey` in display order. */
  private rowAt(offset: number, rowKey: string, page = false): TableRowModel | undefined {
    const model = this.model();
    const row = model.rowByKey.get(rowKey);

    if (!row) {
      return;
    }

    let step = 1;

    if (page) {
      const viewport = this.options.getContainerHeight?.();
      const height = this.options.getRowLayout?.(row.key)?.height;
      step = viewport != null && height ? Math.max(1, Math.floor(viewport / height)) : 10;
    }

    const target = model.rows[row.index + Math.sign(offset) * step];

    return target;
  }

  /** The cell one column across, inside the same row. */
  private sibling(row: TableRowModel, index: number, offset: -1 | 1): TableCellModel | undefined {
    const cells = row.cells;

    if (offset === 1) {
      return cells.find((cell) => cell.columnIndex >= index);
    }

    for (let position = cells.length - 1; position >= 0; position--) {
      const cell = cells[position];

      if (cell.columnIndex < index) {
        return cell;
      }
    }

    return undefined;
  }

  getKeyBelow(key: string) {
    const parsed = this.parse(key);

    if (!parsed) {
      return;
    }

    const model = this.model();

    // A header goes to the first body row in its column.
    if (parsed.kind === "column") {
      const firstRow = model.rows[0];

      if (!firstRow) {
        return;
      }

      const cell = this.cellAt(firstRow, parsed.column.index);

      return cell ? this.cellKey(firstRow, cell) : undefined;
    }

    const next = this.rowAt(1, parsed.row.key);

    if (!next) {
      return;
    }

    const cell = this.cellAt(next, parsed.cell.columnIndex);

    return cell ? this.cellKey(next, cell) : undefined;
  }

  getKeyAbove(key: string) {
    const parsed = this.parse(key);

    if (!parsed) {
      return;
    }

    if (parsed.kind === "column") {
      return;
    }

    const previous = this.rowAt(-1, parsed.row.key);

    if (previous) {
      const cell = this.cellAt(previous, parsed.cell.columnIndex);

      return cell ? this.cellKey(previous, cell) : undefined;
    }

    // The first body row's column header, when there is one.
    const column = this.model().columns[parsed.cell.columnIndex];

    return column ? columnFocusKey(column.key) : undefined;
  }

  getKeyLeftOf(key: string) {
    const parsed = this.parse(key);

    if (!parsed) {
      return;
    }

    if (parsed.kind === "column") {
      const previous = this.model().columns[parsed.column.index - 1];

      return previous ? columnFocusKey(previous.key) : undefined;
    }

    const cell = this.sibling(parsed.row, parsed.cell.columnIndex, -1);

    return cell ? this.cellKey(parsed.row, cell) : undefined;
  }

  getKeyRightOf(key: string) {
    const parsed = this.parse(key);

    if (!parsed) {
      return;
    }

    if (parsed.kind === "column") {
      const next = this.model().columns[parsed.column.index + 1];

      return next ? columnFocusKey(next.key) : undefined;
    }

    const cell = this.sibling(parsed.row, parsed.cell.columnIndex + parsed.cell.colSpan, 1);

    return cell ? this.cellKey(parsed.row, cell) : undefined;
  }

  getKeyPageAbove(key: string) {
    const parsed = this.parse(key);

    if (!parsed || parsed.kind === "column") {
      return this.getKeyAbove(key);
    }

    const target = this.rowAt(-1, parsed.row.key, true);

    if (!target) {
      return;
    }

    const cell = this.cellAt(target, parsed.cell.columnIndex);

    return cell ? this.cellKey(target, cell) : undefined;
  }

  getKeyPageBelow(key: string) {
    const parsed = this.parse(key);

    if (!parsed || parsed.kind === "column") {
      return this.getKeyBelow(key);
    }

    const target = this.rowAt(1, parsed.row.key, true);

    if (!target) {
      return;
    }

    const cell = this.cellAt(target, parsed.cell.columnIndex);

    return cell ? this.cellKey(target, cell) : undefined;
  }

  getFirstKey(key?: string) {
    const model = this.model();
    const rowKey = key != null ? this.rowKeyOf(key) : undefined;
    const row = rowKey != null ? model.rowByKey.get(rowKey) : model.rows[0];

    if (row) {
      const cell = row.cells[0];

      return cell ? this.cellKey(row, cell) : undefined;
    }

    const column = model.columns[0];

    return column ? columnFocusKey(column.key) : undefined;
  }

  getLastKey(key?: string) {
    const model = this.model();
    const rowKey = key != null ? this.rowKeyOf(key) : undefined;
    const row = rowKey != null ? model.rowByKey.get(rowKey) : model.rows[model.rows.length - 1];

    if (row) {
      const cell = row.cells[row.cells.length - 1];

      return cell ? this.cellKey(row, cell) : undefined;
    }

    const column = model.columns[model.columns.length - 1];

    return column ? columnFocusKey(column.key) : undefined;
  }

  /**
   * Typeahead: the next cell whose text starts with `search`, row by row, from
   * the focused cell and around (React Aria's grid delegate searches cells,
   * not rows: `Table`'s typeahead lands on a cell, T-008).
   */
  getKeyForSearch(search: string, fromKey?: string) {
    const model = this.model();
    const needle = search.toLocaleLowerCase();
    const order: Array<{ row: TableRowModel; cell: TableCellModel }> = [];

    for (const row of model.rows) {
      for (const cell of row.cells) {
        order.push({ row, cell });
      }
    }

    const from = fromKey != null ? this.parse(fromKey) : undefined;
    let start = 0;

    if (from?.kind === "cell") {
      const index = order.findIndex(
        (entry) =>
          entry.row.key === from.row.key && entry.cell.columnIndex === from.cell.columnIndex,
      );

      start = index < 0 ? 0 : index + 1;
    }

    const ordered = [...order.slice(start), ...order.slice(0, start)];

    for (const entry of ordered) {
      const text = entry.cell.textValue.toLocaleLowerCase();

      if (text && text.startsWith(needle)) {
        return this.cellKey(entry.row, entry.cell);
      }
    }

    return undefined;
  }
}
