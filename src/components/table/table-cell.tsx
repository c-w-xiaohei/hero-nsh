import type { JSX, PressEvent, StyleProp, ViewRef, ViewStyle } from "nsh";
import { cleanup, computed, signal, split, View } from "nsh";

import { isKeyboardPress } from "../../primitives";
import { renderPartChildren, textOf } from "./table-children";
import {
  TableRowContext,
  TableStateContext,
  claimPress,
  type TableCellRenderProps,
} from "./table-context";
import { cellFocusKey, type TableColumnDescriptor } from "./create-table-collection";
import { type TablePartProps } from "./table-props";
import { useTableSlots, useTableVariant } from "./table-slots";

export interface TableCellProps extends TablePartProps {
  /** The cell's text for typeahead, and its row's when it is the row header. */
  textValue?: string;

  /** `grid-column: span N` (§4, "跨列的单元格"). */
  colSpan?: number;

  /** React Aria's per-cell focus modes: accepted, no effect (§8). */
  focusMode?: string;
  allowsArrowNavigation?: boolean;

  /** A tree cell's depth, when the caller drives the row's own nesting. */
  isTreeColumn?: boolean;
  level?: number;

  children?: JSX.Element | ((values: TableCellRenderProps) => JSX.Element);
}

/**
 * `Table.Cell` / `TableCell`: one `role="cell"` view in a row's grid. It takes
 * its column from the row's cursor (the caller writes cells in column order,
 * as in HeroUI), applies a spanning cell's `grid-column`, and owns the cell
 * half of the interaction: focusing, selecting its row, and the tree column's
 * inline start inset (R-049).
 */
export function TableCell(props: TableCellProps) {
  const [local, rest] = split(props, [
    "children",
    "className",
    "style",
    "ref",
    "id",
    "textValue",
    "colSpan",
    "focusMode",
    "allowsArrowNavigation",
    "isTreeColumn",
    "level",
    "render",
    "items",
    "dependencies",
    "onLayout",
    "onPress",
    "onPressDown",
    "onPressUp",
    "onMouseEnter",
    "onMouseLeave",
    "onFocus",
    "onBlur",
  ] as const);

  const table = TableStateContext();
  const slots = useTableSlots();
  const variant = useTableVariant();
  const row = TableRowContext();

  if (!table || !row) {
    return null;
  }

  const { state, registry, modality } = table;

  const rowKey = row.rowKey;
  const columnIndex = row.nextCellIndex();

  let node: ViewRef | undefined;

  const cellKey = cellFocusKey(rowKey, columnIndex);

  // The column at this cell's start column. The columns register before the
  // bodies do, so it is known by the time the collection reads this cell's
  // descriptor (which may be immediately: `cells.set` notifies synchronously).
  const columnDescriptor = (): TableColumnDescriptor | undefined => {
    const columns = [...registry.columns()].sort((a, b) => a.order - b.order);

    return columns[columnIndex];
  };

  cleanup(
    registry.registerCell({
      key: cellKey,
      rowKey,
      columnIndex,
      colSpan: () => Math.max(1, local.colSpan ?? 1),
      textValue: () => local.textValue ?? textOf(local.children as JSX.Element),
      // HeroUI has no `isRowHeader` on `Cell`; the column carries it.
      isRowHeader: () =>
        local.isTreeColumn === true || columnDescriptor()?.isRowHeader() === true,
      ref: () => node,
    }),
  );

  const rowModel = computed(() => state.collection().rowByKey.get(rowKey));
  const cellModel = computed(() => state.collection().cellByKey.get(cellKey));

  const isHovered = signal(false);
  const isPressed = signal(false);

  const isSelected = computed(() => state.isSelected(rowKey));
  // The selection manager covers `disabledKeys` and `disabledBehavior` (§1);
  // the descriptor's own flag is the collection's business.
  const isDisabled = computed(() => state.isDisabled(rowKey));
  const isExpanded = computed(() => state.isExpanded(rowKey));
  const hasChildItems = computed(() => rowModel()?.hasChildItems ?? false);
  const level = computed(() => rowModel()?.level ?? local.level ?? 1);
  const isTreeColumn = computed(
    () => local.isTreeColumn === true || table.treeColumn() === cellModel()?.columnKey,
  );

  const isFocused = computed(() => state.focusedKey() === cellKey);
  const isFocusVisible = computed(() => isFocused() && table.isKeyboard());
  const isFocusVisibleWithinRow = computed(
    () => state.focusedCellIn(rowKey) && table.isKeyboard(),
  );

  const renderProps: TableCellRenderProps = {
    isSelected,
    isDisabled,
    isPressed,
    isHovered,
    isFocused,
    isFocusVisible,
    isFocusVisibleWithinRow,
    id: cellKey,
    columnIndex,
    isTreeColumn,
    isExpanded,
    hasChildItems,
    level,
  };

  const resolvedClassName = () => {
    const className = local.className;

    return typeof className === "function"
      ? (className as (values: TableCellRenderProps) => string | undefined)(renderProps)
      : className;
  };

  const resolvedStyle = () => {
    const style = local.style;

    return typeof style === "function"
      ? (style as (values: TableCellRenderProps) => StyleProp<ViewStyle>)(renderProps)
      : style;
  };

  const stateClasses = computed(() => {
    const model = cellModel();

    return [
      // R-028 (first row, first column), R-029 (first row, last column),
      // R-030 (last row, first column) and R-031 (last row, last column): the
      // white card's corners. R-011 leaves the secondary's cells square, so
      // they are added on the primary variant only.
      variant() === "primary" && model?.isFirstColumn && rowModel()?.isFirst
        ? "rounded-ss-2xl"
        : "",
      variant() === "primary" && model?.isFirstColumn && rowModel()?.isLast
        ? "rounded-es-2xl"
        : "",
      variant() === "primary" && model?.isLastColumn && rowModel()?.isFirst
        ? "rounded-se-2xl"
        : "",
      variant() === "primary" && model?.isLastColumn && rowModel()?.isLast
        ? "rounded-ee-2xl"
        : "",
      // R-036: the selected row's surface shift.
      "group-selected:bg-surface/10",
      // R-043: the cell's own focus ring.
      isFocusVisible() ? "rounded-lg outline-none inset-ring-2 inset-ring-focus" : "",
    ]
      .filter(Boolean)
      .join(" ");
  });

  // Three inline properties, each with one owner (§4): the span (R-028–R-031's
  // geometry), the tree column's start inset (R-049) and the row's grid tracks
  // (the row owns those).
  const geometry = computed(() => {
    const style: Record<string, string | number> = {};

    if ((local.colSpan ?? 1) > 1) {
      style.gridColumn = `span ${local.colSpan}`;
    }

    if (isTreeColumn()) {
      style.paddingStart = 16 * Math.max(1, level());
    }

    return style;
  });

  const focusCell = () => {
    if (!state.isCellFocusable()) {
      // `keyboardNavigationBehavior: "arrow"`: the grid is the focus stop.
      state.focusCell(rowKey, columnIndex);
      table.focusGrid();
      return;
    }

    state.focusCell(rowKey, columnIndex);
    node?.focus();
  };

  const handlePressDown = (event: PressEvent) => {
    isPressed.set(true);

    if (isKeyboardPress(event)) {
      modality.setKeyboardModality();
    } else {
      modality.setPointerModality();
    }

    local.onPressDown?.(event);
  };

  const handlePressUp = (event: PressEvent) => {
    isPressed.set(false);
    local.onPressUp?.(event);
  };

  const handlePress = (event: PressEvent) => {
    isPressed.set(false);

    if (!isKeyboardPress(event)) {
      modality.setPointerModality();
    }

    // The row also hears a bubbling press and would select the row a second
    // time; the first handler claims it.
    if (!claimPress(event)) {
      local.onPress?.(event);
      return;
    }

    if (isDisabled()) {
      local.onPress?.(event);
      return;
    }

    focusCell();

    // §1 events: the press selects the row, and reports the row action when
    // the row cannot be selected or the table replaces its selection on each
    // press. The row's own `onAction` follows from the bubbling press.
    const selectable = state.selectionMode() !== "none";

    if (selectable) {
      state.rowSelectionManager.select(rowKey);
    }

    if (!selectable || state.selectionBehavior() === "replace") {
      table.onRowAction(rowKey);
    }

    local.onPress?.(event);
  };

  return (
    <View
      {...(rest as any)}
      ref={(view) => {
        node = view;
        local.ref?.(view);
      }}
      nativeID={local.id ?? (rest as any).nativeID}
      role="cell"
      focusable={state.isCellFocusable()}
      accessibilityState={{ selected: isSelected(), disabled: isDisabled() }}
      onLayout={local.onLayout}
      onFocus={() => {
        state.noteFocus();
        state.focusCell(rowKey, columnIndex);
        local.onFocus?.();
      }}
      onBlur={() => {
        state.noteBlur();
        local.onBlur?.();
      }}
      onMouseEnter={(event) => {
        isHovered.set(true);
        local.onMouseEnter?.(event);
      }}
      onMouseLeave={(event) => {
        isHovered.set(false);
        local.onMouseLeave?.(event);
      }}
      onPressDown={handlePressDown}
      onPressUp={handlePressUp}
      onPress={handlePress}
      class={[
        slots().cell({ treeColumn: isTreeColumn() }),
        "min-w-0",
        stateClasses(),
        resolvedClassName(),
      ]
        .filter(Boolean)
        .join(" ")}
      style={[geometry(), resolvedStyle()]}
    >
      {renderPartChildren(local.children as JSX.Element, renderProps)}
    </View>
  );
}
