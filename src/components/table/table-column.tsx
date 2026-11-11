import type { Bounds, JSX, PressEvent, StyleProp, ViewRef, ViewStyle } from "nsh";
import { cleanup, computed, signal, split, View } from "nsh";

import { isKeyboardPress } from "../../primitives";
import { renderPartChildren, textOf } from "./table-children";
import {
  TableColumnContext,
  TableStateContext,
  claimPress,
  type TableColumnContextValue,
  type TableColumnRenderProps,
} from "./table-context";
import { columnFocusKey } from "./create-table-collection";
import { type TablePartProps } from "./table-props";
import { useTableSlots, useTableVariant } from "./table-slots";

export interface TableColumnProps extends TablePartProps {
  allowsSorting?: boolean;
  isRowHeader?: boolean;

  /** The column's text for typeahead and the sortable label. */
  textValue?: string;

  width?: number | string;
  defaultWidth?: number | string;
  minWidth?: number;
  maxWidth?: number;

  /** React Aria's per-cell focus modes: accepted, no effect (§8). */
  focusMode?: string;
  allowsArrowNavigation?: boolean;

  children?: JSX.Element | ((values: TableColumnRenderProps) => JSX.Element);
}

let generatedColumnCount = 0;

/**
 * `Table.Column` / `TableColumn`: a `role="columnheader"` cell of the header
 * row. It registers its descriptor (text, width constraints, sorting) with the
 * content's collection, and presses on it sort when `allowsSorting` (§1
 * events). The divider after the label is a real child view (R-019 / R-020),
 * hidden when the column is last or holds a resizer (R-057).
 */
export function TableColumn(props: TableColumnProps) {
  const [local, rest] = split(props, [
    "children",
    "className",
    "style",
    "ref",
    "id",
    "textValue",
    "width",
    "defaultWidth",
    "minWidth",
    "maxWidth",
    "allowsSorting",
    "isRowHeader",
    "focusMode",
    "allowsArrowNavigation",
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

  if (!table) {
    return null;
  }

  const { state, registry, layout, modality } = table;

  let node: ViewRef | undefined;

  const { descriptor, unregister } = registry.registerColumn({
    key: local.id != null ? String(local.id) : `column-${generatedColumnCount++}`,
    textValue: () => local.textValue ?? textOf(local.children as JSX.Element),
    width: () => local.width,
    defaultWidth: () => local.defaultWidth,
    minWidth: () => local.minWidth,
    maxWidth: () => local.maxWidth,
    allowsSorting: () => local.allowsSorting === true,
    isRowHeader: () => local.isRowHeader === true,
    ref: () => node,
  });

  cleanup(unregister);

  const columnKey = descriptor.key;

  const isHovered = signal(false);
  const isPressed = signal(false);

  const model = computed(() => state.collection().columnByKey.get(columnKey));
  const isFocused = computed(() => state.isColumnFocused(columnKey));
  const isFocusVisible = computed(() => isFocused() && table.isKeyboard());
  const sortDirection = computed(() => state.sortDirectionOf(columnKey));
  const isResizing = computed(() => layout.resizingColumn() === columnKey);

  const sort = (direction?: "ascending" | "descending") => {
    if (direction == null) {
      state.toggleSort(columnKey);
      return;
    }

    // An explicit direction from the render props sets the descriptor.
    state.setSort(columnKey, direction);
  };

  let focusResizer: (() => void) | undefined;

  // The column's `startResize` render value puts the focus on its resizer,
  // which is where React Aria's hidden range input lives.
  const startResize = () => {
    state.focusColumn(columnKey);
    focusResizer?.();
  };

  const renderProps: TableColumnRenderProps = {
    isHovered,
    isPressed,
    isFocused,
    isFocusVisible,
    allowsSorting: () => local.allowsSorting === true,
    sortDirection,
    isResizing,
    sort,
    startResize,
  };

  const resolvedClassName = () => {
    const className = local.className;

    return typeof className === "function"
      ? (className as (values: TableColumnRenderProps) => string | undefined)(renderProps)
      : className;
  };

  const resolvedStyle = () => {
    const style = local.style;

    return typeof style === "function"
      ? (style as (values: TableColumnRenderProps) => StyleProp<ViewStyle>)(renderProps)
      : style;
  };

  const positionClasses = computed(() => {
    if (variant() !== "secondary") {
      return "";
    }

    const column = model();

    // R-008: the first header column takes the card's start corners.
    // R-009: the last header column takes its end corners.
    return [
      column?.isFirst ? "rounded-ss-2xl rounded-es-2xl" : "",
      column?.isLast ? "rounded-se-2xl rounded-ee-2xl" : "",
    ]
      .filter(Boolean)
      .join(" ");
  });

  const stateClasses = computed(() =>
    [
      // R-021 / R-022: a sortable column is interactive and darkens its label.
      local.allowsSorting === true ? "cursor-pointer hover:text-foreground" : "",
      // R-023: the keyboard focus ring.
      isFocusVisible() ? "rounded-lg outline-none inset-ring-2 inset-ring-focus" : "",
      positionClasses(),
    ]
      .filter(Boolean)
      .join(" "),
  );

  // R-020 / R-057: the divider goes away on the last column and when a
  // resizer takes its place. R-024 (the divider inside a virtualizer's
  // `role="presentation"` wrapper) has no trigger: HeroUI exposes no
  // virtualization and this port has none (§8).
  const showDivider = computed(() => {
    const column = model();

    if (!column) {
      return false;
    }

    return (!column.isLast || column.isOnly) && !column.hasResizer;
  });

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

  // React Aria focuses the header cell on a press (the grid's focused key
  // moves), which is what makes the arrows navigate from there afterwards. In
  // "arrow" mode the grid is the only focus stop, so the key moves without a
  // view focusing (§2, "focusedKey").
  const focusColumn = () => {
    state.focusColumn(columnKey);

    if (!state.isCellFocusable()) {
      table.focusGrid();
    }
  };

  const handlePress = (event: PressEvent) => {
    isPressed.set(false);

    if (!isKeyboardPress(event)) {
      modality.setPointerModality();
    }

    // A press on the resizer inside the column is a resize, not a sort: the
    // resizer claims it first as it bubbles out.
    if (!claimPress(event)) {
      local.onPress?.(event);
      return;
    }

    focusColumn();

    if (local.allowsSorting === true) {
      state.toggleSort(columnKey);
    }

    local.onPress?.(event);
  };

  const handleLayout = (event: { bounds: Bounds }) => {
    local.onLayout?.(event);
  };

  const columnContext: TableColumnContextValue = {
    columnKey,
    index: computed(() => model()?.index ?? 0),
    sortDirection,
    startResize,
    registerResizer: (focus) => {
      descriptor.resizers.set(descriptor.resizers() + 1);
      focusResizer = focus;

      return () => {
        descriptor.resizers.set(Math.max(0, descriptor.resizers() - 1));
        focusResizer = undefined;
      };
    },
  };

  return (
    <TableColumnContext.Provider value={columnContext}>
      <View
        {...(rest as any)}
        ref={(view) => {
          node = view;
          local.ref?.(view);
        }}
        nativeID={local.id}
        role="columnheader"
        focusable={state.isCellFocusable()}
        onLayout={handleLayout}
        onFocus={() => {
          state.noteFocus();
          state.focusColumn(columnKey);
          local.onFocus?.();
        }}
        onBlur={() => {
          // RAC's press state ends with the focus (§2, press state row).
          isPressed.set(false);
          state.noteBlur();
          local.onBlur?.();
        }}
        onMouseEnter={(event) => {
          // RAC enables hover on a column only while it can sort (§2, hover).
          if (local.allowsSorting === true) {
            isHovered.set(true);
          }
          local.onMouseEnter?.(event);
        }}
        onMouseLeave={(event) => {
          isHovered.set(false);
          local.onMouseLeave?.(event);
        }}
        onPressDown={handlePressDown}
        onPressUp={handlePressUp}
        onPress={handlePress}
        class={[slots().column(), stateClasses(), resolvedClassName()]
          .filter(Boolean)
          .join(" ")}
        style={resolvedStyle()}
      >
        {renderPartChildren(local.children as JSX.Element, renderProps)}
        <If when={showDivider()}>
          <View class="pointer-events-none absolute end-0 top-1/2 h-4 w-px -translate-y-1/2 rounded-sm bg-separator" />
        </If>
      </View>
    </TableColumnContext.Provider>
  );
}
