/*
 * The table's state (port sheet §2): the collection, selection, sorting,
 * expansion, focus and the keyboard contract in one object that
 * `Table.Content` owns and every part reads from the context.
 *
 * The shape follows React Stately's `useTableState` (tier R). Kobalte has no
 * table, but its selection cluster does: `createMultipleSelectionState` owns
 * the selected keys, `SelectionManager` resolves `"all"` and the row order, and
 * `createSelectableCollection` owns the key handling (arrows, Home / End, the
 * page keys, typeahead, Escape, select-all), with our two-dimensional
 * `GridKeyboardDelegate` plugged into its `keyboardDelegate` hole (§5).
 *
 * One adaptation is needed: a grid's focused key is a *cell* (or a column
 * header) while a selection is a set of *rows*. `TableSelectionManager` maps a
 * cell key to its row before every selection call, exactly as
 * `@react-stately/table`'s own manager does for the same reason.
 */

import type { Accessor, Bounds, ViewRef } from "nsh";
import { computed, effect, signal } from "nsh";

import {
  type KeyboardDelegate,
  type MultipleSelectionManager,
  type SelectionBehavior,
  type SelectionManager,
  type SelectionMode,
  type SelectionModifiers,
  type SelectionValue,
  ListCollection,
  SelectionManager as RowSelectionManager,
  createControllableSignal,
  createMultipleSelectionState,
  createSelectableCollection,
} from "../../primitives";
import { GridKeyboardDelegate } from "./create-grid-keyboard-delegate";
import type {
  TableCellModel,
  TableCollectionModel,
} from "./create-table-collection";
import {
  CELL_FOCUS_PREFIX,
  COLUMN_FOCUS_PREFIX,
  cellFocusKey,
  columnFocusKey,
} from "./create-table-collection";

/** `{column, direction}` as the sheet's §1 events table spells it. */
export interface TableSortDescriptor {
  column: string;
  direction: "ascending" | "descending";
}

export interface CreateTableStateProps {
  collection: Accessor<TableCollectionModel>;

  selectionMode: Accessor<"none" | "single" | "multiple">;
  selectionBehavior: Accessor<"toggle" | "replace">;
  disallowEmptySelection: Accessor<boolean>;
  disabledKeys: Accessor<ReadonlySet<string>>;
  disabledBehavior: Accessor<"all" | "selection">;
  selectedKeys: Accessor<"all" | Iterable<string | number> | undefined>;
  defaultSelectedKeys: Accessor<"all" | Iterable<string | number> | undefined>;
  onSelectionChange: (keys: "all" | Set<string>) => void;

  sortDescriptor: Accessor<TableSortDescriptor | undefined>;
  defaultSortDescriptor: Accessor<TableSortDescriptor | undefined>;
  onSortChange: (descriptor: TableSortDescriptor) => void;

  /** The expanded row keys, owned by `Table.Content` (its controlled store). */
  expandedKeys: Accessor<Set<string>>;
  setExpandedKeys: (keys: Set<string>) => void;

  /** `"tab"` (default) keeps every cell a Tab stop; `"arrow"` only the grid. */
  keyboardNavigationBehavior?: Accessor<"tab" | "arrow" | undefined>;
}

export interface TableState {
  collection: Accessor<TableCollectionModel>;

  /** The grid-facing manager: cell keys in, row selection out. */
  selectionManager: Accessor<MultipleSelectionManager>;

  /** The row selection manager itself (keys are row keys). */
  rowSelectionManager: SelectionManager;

  selectionMode: Accessor<SelectionMode>;
  selectionBehavior: Accessor<SelectionBehavior>;
  disallowEmptySelection: Accessor<boolean>;

  isSelected(rowKey: string): boolean;
  isDisabled(rowKey: string): boolean;
  isSelectAll(): boolean;
  isIndeterminate(): boolean;
  toggleRowSelection(rowKey: string): void;
  selectRow(rowKey: string): void;
  clearSelection(): void;
  selectAll(): void;

  isFocused: Accessor<boolean>;
  focusedKey: Accessor<string | undefined>;
  noteFocus(): void;
  noteBlur(): void;
  focusCell(rowKey: string, columnIndex: number): void;
  focusColumn(columnKey: string): void;
  focusView(rowKey?: string, columnIndex?: number): void;
  focusedCellIn(rowKey: string): boolean;
  isColumnFocused(columnKey: string): boolean;
  focusedColumnIndex(): number | undefined;

  sortDescriptor: Accessor<TableSortDescriptor | undefined>;
  sortDirectionOf(columnKey: string): "ascending" | "descending" | undefined;
  toggleSort(columnKey: string): void;
  setSort(columnKey: string, direction: "ascending" | "descending"): void;

  expandedKeys: Accessor<Set<string>>;
  isExpanded(rowKey: string): boolean;
  toggleExpanded(rowKey: string): void;

  /** `false` with `keyboardNavigationBehavior: "arrow"`: the grid holds the focus. */
  isCellFocusable: Accessor<boolean>;

  onKeyDown(key: string, modifiers?: SelectionModifiers): void;

  registerRowLayout(rowKey: string, bounds: Bounds): void;
  rowLayout(rowKey: string): { y: number; height: number } | undefined;

  /** The viewport height the scroll container reported, for the page keys. */
  setContainerHeight(height: number | undefined): void;

  /** The view that takes the focus for a cell / header, for `ref.focus()`. */
  cellView(rowKey: string, columnIndex: number): ViewRef | undefined;
  columnView(columnKey: string): ViewRef | undefined;
}

function normalizeSelection(
  value: "all" | Iterable<string | number> | undefined,
): SelectionValue | undefined {
  if (value == null) {
    return undefined;
  }

  if (value === "all") {
    return "all";
  }

  const keys = new Set<string>();

  for (const key of value) {
    keys.add(String(key));
  }

  return keys;
}

function normalizeSortDescriptor(
  value: TableSortDescriptor | undefined,
): TableSortDescriptor | undefined {
  return value == null ? undefined : { column: String(value.column), direction: value.direction };
}

export function createTableState(props: CreateTableStateProps): TableState {
  const collection = props.collection;

  const selectionState = createMultipleSelectionState({
    selectionMode: () => props.selectionMode(),
    selectionBehavior: () => props.selectionBehavior(),
    disallowEmptySelection: () => props.disallowEmptySelection(),
    disabledBehavior: () => props.disabledBehavior(),
    selectedKeys: computed(() => normalizeSelection(props.selectedKeys())),
    defaultSelectedKeys: computed(() => normalizeSelection(props.defaultSelectedKeys())),
    onSelectionChange: (keys) => props.onSelectionChange(keys),
  });

  // The row collection the selection manager resolves keys, ranges and
  // "select all" against: visible rows only, in display order.
  const rowCollection = computed(
    () =>
      new ListCollection(
        collection().rows.map((row) => ({
          type: "item" as const,
          key: row.key,
          textValue: row.textValue,
          disabled: row.isDisabled,
          level: row.level,
          index: row.index,
          rawValue: row,
        })),
      ),
  );

  const rowManager = new RowSelectionManager(rowCollection, selectionState);

  const focusedKey = signal<string | undefined>(undefined);
  const isFocused = signal(false);

  /** A cell or a column header, by its focus key. */
  const targetRowKey = (key: string): string | undefined => {
    if (!key.startsWith(CELL_FOCUS_PREFIX)) {
      return;
    }

    const rest = key.slice(CELL_FOCUS_PREFIX.length);
    const separator = rest.lastIndexOf("\u0001");

    return separator < 0 ? undefined : rest.slice(0, separator);
  };

  const hasFocusKey = (key: string): boolean => {
    const model = collection();

    if (key.startsWith(COLUMN_FOCUS_PREFIX)) {
      return model.columnByKey.has(key.slice(COLUMN_FOCUS_PREFIX.length));
    }

    return model.cellByKey.has(key);
  };

  // `@react-stately/table`'s TableSelectionManager: a cell key selects its row.
  const selectionManager: MultipleSelectionManager = {
    selectionMode: () => rowManager.selectionMode(),
    selectionBehavior: () => rowManager.selectionBehavior(),
    disabledBehavior: () => rowManager.disabledBehavior(),
    disallowEmptySelection: () => rowManager.disallowEmptySelection(),
    selectedKeys: () => rowManager.selectedKeys(),
    isEmpty: () => rowManager.isEmpty(),
    isSelectAll: () => rowManager.isSelectAll(),
    firstSelectedKey: () => rowManager.firstSelectedKey(),
    lastSelectedKey: () => rowManager.lastSelectedKey(),
    isSelected: (key) => {
      const rowKey = targetRowKey(key);

      return rowKey == null ? rowManager.isSelected(key) : rowManager.isSelected(rowKey);
    },
    isSelectionEqual: (selection) => rowManager.isSelectionEqual(selection),
    extendSelection: (key) => {
      const rowKey = targetRowKey(key) ?? key;

      rowManager.extendSelection(rowKey);
    },
    toggleSelection: (key) => {
      const rowKey = targetRowKey(key) ?? key;

      rowManager.toggleSelection(rowKey);
    },
    replaceSelection: (key) => {
      const rowKey = targetRowKey(key) ?? key;

      rowManager.replaceSelection(rowKey);
    },
    setSelectedKeys: (keys) => rowManager.setSelectedKeys(keys),
    selectAll: () => rowManager.selectAll(),
    clearSelection: () => rowManager.clearSelection(),
    toggleSelectAll: () => rowManager.toggleSelectAll(),
    select: (key, pointerType) => {
      const rowKey = targetRowKey(key) ?? key;

      rowManager.select(rowKey, pointerType);
    },
    canSelectItem: (key) => {
      const rowKey = targetRowKey(key);

      return rowKey == null ? false : rowManager.canSelectItem(rowKey);
    },
    isDisabled: (key) => {
      const rowKey = targetRowKey(key);

      return rowKey == null ? false : rowManager.isDisabled(rowKey);
    },
    setSelectionBehavior: (behavior) => rowManager.setSelectionBehavior(behavior),
    isFocused: () => isFocused(),
    focusedKey: () => focusedKey(),
    setFocused: (value) => isFocused.set(value),
    setFocusedKey: (key) => {
      if (key == null) {
        focusedKey.set(undefined);
        return;
      }

      if (hasFocusKey(key)) {
        focusedKey.set(key);
      }
    },
  };

  const rowLayouts = signal<ReadonlyMap<string, { y: number; height: number }>>(new Map());
  const containerHeight = signal<number | undefined>(undefined);

  const delegate: KeyboardDelegate = new GridKeyboardDelegate(collection, {
    getRowLayout: (rowKey) => rowLayouts().get(rowKey),
    getContainerHeight: () => containerHeight(),
  });

  const selectable = createSelectableCollection({
    selectionManager: () => selectionManager,
    keyboardDelegate: () => delegate,
    orientation: () => "vertical",
    // Arrow-key focus never selects; a press or Return / Space does (§1
    // events, the row's `onAction`).
    selectOnFocus: () => false,
    shouldFocusWrap: () => false,
    focusCollection: () => isFocused.set(true),
  });

  // Focus follows `focusedKey`, the effect standing in for
  // `useSelectableCollection`'s post-render `focus()` (§2 side effects).
  let focusedNode: ViewRef | undefined;

  effect(() => {
    const key = focusedKey();

    if (key == null || !isFocused()) {
      return;
    }

    const node = focusKeyView(key);

    if (node && node !== focusedNode) {
      focusedNode = node;
      node.focus();
    }
  });

  const [sortDescriptor, setSortDescriptor] = createControllableSignal<
    TableSortDescriptor | undefined
  >({
    value: computed(() => normalizeSortDescriptor(props.sortDescriptor())),
    defaultValue: computed(() => normalizeSortDescriptor(props.defaultSortDescriptor())),
    onChange: (value) => {
      if (value != null) {
        props.onSortChange(value);
      }
    },
  });

  const expanded = computed(() => props.expandedKeys());

  // `keyboardNavigationBehavior: "arrow"` keeps the grid itself as the focus
  // stop (arrows move between cells); the default lets every cell be a Tab
  // stop, which is the only Tab behavior NSH can offer (§8, Tab boundary).
  const isCellFocusable = computed(
    () => (props.keyboardNavigationBehavior?.() ?? "tab") !== "arrow",
  );

  let focusCount = 0;

  const sortDirectionOf = (
    columnKey: string,
  ): "ascending" | "descending" | undefined => {
    const current = sortDescriptor();

    return current?.column === columnKey ? current.direction : undefined;
  };

  const cellView = (rowKey: string, columnIndex: number) =>
    collection().cellByKey.get(cellFocusKey(rowKey, columnIndex))?.ref;

  const columnView = (columnKey: string) => collection().columnByKey.get(columnKey)?.ref;

  const focusKeyView = (key: string): ViewRef | undefined => {
    if (key.startsWith(COLUMN_FOCUS_PREFIX)) {
      return columnView(key.slice(COLUMN_FOCUS_PREFIX.length));
    }

    const model = collection();
    const cell: TableCellModel | undefined = model.cellByKey.get(key);

    return cell?.ref;
  };

  const setFocus = (key: string) => {
    isFocused.set(true);
    focusedKey.set(key);
  };

  const state: TableState = {
    collection,
    selectionManager: () => selectionManager,
    rowSelectionManager: rowManager,

    selectionMode: () => rowManager.selectionMode(),
    selectionBehavior: () => rowManager.selectionBehavior(),
    disallowEmptySelection: () => rowManager.disallowEmptySelection(),

    isSelected: (rowKey) => rowManager.isSelected(rowKey),
    isDisabled: (rowKey) => rowManager.isDisabled(rowKey),
    isSelectAll: () => rowManager.isSelectAll(),
    isIndeterminate: () => !rowManager.isEmpty() && !rowManager.isSelectAll(),
    toggleRowSelection: (rowKey) => rowManager.toggleSelection(rowKey),
    selectRow: (rowKey) => rowManager.select(rowKey),
    clearSelection: () => rowManager.clearSelection(),
    selectAll: () => rowManager.selectAll(),

    isFocused,
    focusedKey,
    noteFocus: () => {
      focusCount += 1;
      isFocused.set(true);
    },
    noteBlur: () => {
      focusCount = Math.max(0, focusCount - 1);

      if (focusCount === 0) {
        isFocused.set(false);
      }
    },
    focusCell: (rowKey, columnIndex) => setFocus(cellFocusKey(rowKey, columnIndex)),
    focusColumn: (columnKey) => setFocus(columnFocusKey(columnKey)),
    focusView: (rowKey, columnIndex) => {
      if (rowKey == null) {
        isFocused.set(true);
        return;
      }

      setFocus(cellFocusKey(rowKey, columnIndex ?? 0));
    },
    focusedCellIn: (rowKey) => targetRowKey(focusedKey() ?? "") === rowKey,
    isColumnFocused: (columnKey) =>
      focusedKey() === columnFocusKey(columnKey),
    focusedColumnIndex: () => {
      const key = focusedKey();

      if (key == null) {
        return;
      }

      if (key.startsWith(COLUMN_FOCUS_PREFIX)) {
        return collection().columnByKey.get(key.slice(COLUMN_FOCUS_PREFIX.length))?.index;
      }

      return collection().cellByKey.get(key)?.columnIndex;
    },

    sortDescriptor,
    sortDirectionOf,
    toggleSort: (columnKey) => {
      const current = sortDescriptor();
      const direction =
        current?.column === columnKey && current.direction === "ascending"
          ? "descending"
          : "ascending";

      setSortDescriptor({ column: columnKey, direction });
    },
    setSort: (columnKey, direction) => {
      if (sortDirectionOf(columnKey) === direction) {
        return;
      }

      setSortDescriptor({ column: columnKey, direction });
    },

    expandedKeys: expanded,
    isExpanded: (rowKey) => expanded().has(rowKey),
    toggleExpanded: (rowKey) => {
      const next = new Set(expanded());

      if (next.has(rowKey)) {
        next.delete(rowKey);
      } else {
        next.add(rowKey);
      }

      props.setExpandedKeys(next);
    },

    isCellFocusable,
    onKeyDown: (key, modifiers) => selectable.onKeyDown(key, modifiers),

    registerRowLayout: (rowKey, bounds) => {
      const next = new Map(rowLayouts());

      next.set(rowKey, {
        y: bounds.origin.y,
        height: bounds.size.height,
      });
      rowLayouts.set(next);
    },
    rowLayout: (rowKey) => rowLayouts().get(rowKey),
    setContainerHeight: (height) => containerHeight.set(height),

    cellView,
    columnView,
  };

  return state;
}
