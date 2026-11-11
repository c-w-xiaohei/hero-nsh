import type { JSX, PressEvent, StyleProp, ViewRef, ViewStyle } from "nsh";
import { cleanup, computed, signal, split, View } from "nsh";

import { isKeyboardPress } from "../../primitives";
import { renderPartChildren, textOf } from "./table-children";
import {
  TableRowContext,
  TableStateContext,
  claimPress,
  type TableRowRenderProps,
} from "./table-context";
import { type TablePartProps } from "./table-props";
import { useTableSlots } from "./table-slots";

export interface TableRowProps extends TablePartProps {
  /** The row's key in the collection (`id` upstream). */
  id?: string;

  value?: unknown;
  textValue?: string;
  columns?: unknown;

  isDisabled?: boolean;
  disabledBehavior?: "all" | "selection";

  /** Called when a press cannot select the row (§1 events). */
  onAction?: () => void;

  /** Declares child rows that are not rendered yet (a tree row). */
  hasChildItems?: boolean;

  href?: string;
  target?: string;
  rel?: string;
  download?: string;
  ping?: string;
  referrerPolicy?: string;
  hrefLang?: string;
  routerOptions?: unknown;

  onHoverStart?: unknown;
  onHoverEnd?: unknown;
  onHoverChange?: (isHovering: boolean) => void;

  children?: JSX.Element | ((values: TableRowRenderProps) => JSX.Element);
}

let generatedRowCount = 0;

/**
 * `Table.Row` / `TableRow`: one `role="row"` grid row. It registers its key,
 * parent and text with the content's collection (a nested row reads this row's
 * context and becomes its child, which is how the tree shape is built without
 * a collection traversal, §5), and it provides the cell cursor its cells take
 * their column index from.
 *
 * The focus ring is one overlay view for the whole row (R-045–R-048); upstream
 * spliced it from the cells' inset shadows, and this port replaces the "clear
 * then rebuild" rules (R-044) with a single ring.
 */
export function TableRow(props: TableRowProps) {
  const [local, rest] = split(props, [
    "children",
    "className",
    "style",
    "ref",
    "id",
    "value",
    "textValue",
    "columns",
    "isDisabled",
    "disabledBehavior",
    "onAction",
    "hasChildItems",
    "href",
    "target",
    "rel",
    "download",
    "ping",
    "referrerPolicy",
    "hrefLang",
    "routerOptions",
    "onHoverStart",
    "onHoverEnd",
    "onHoverChange",
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

  if (!table) {
    return null;
  }

  const { state, registry, layout, modality } = table;
  const parentRow = TableRowContext();


  const key = local.id != null ? String(local.id) : `row-${generatedRowCount++}`;

  let node: ViewRef | undefined;

  cleanup(
    registry.registerRow({
      key,
      parentKey: () => parentRow?.rowKey,
      textValue: () => local.textValue ?? textOf(local.children as JSX.Element),
      hasChildItems: () => local.hasChildItems,
      isDisabled: () => local.isDisabled === true,
      ref: () => node,
    }),
  );

  const model = computed(() => state.collection().rowByKey.get(key));

  const isHovered = signal(false);
  const isPressed = signal(false);

  // The cell cursor: each cell takes the next column index in render order.
  let nextCell = 0;

  const isSelected = computed(() => state.isSelected(key));
  const isDisabled = computed(() => model()?.isDisabled ?? local.isDisabled === true);
  const isExpanded = computed(() => state.isExpanded(key));
  const hasChildItems = computed(() => model()?.hasChildItems ?? local.hasChildItems === true);
  const level = computed(() => model()?.level ?? parentRow?.level ?? 1);

  const isFocused = computed(() => state.focusedCellIn(key));
  const isFocusVisible = computed(() => isFocused() && table.isKeyboard());

  const renderProps: TableRowRenderProps = {
    isSelected,
    isDisabled,
    isPressed,
    isHovered,
    isFocused,
    isFocusVisible,
    // NSH has no focus-within query: the row counts as focused while one of
    // its cells holds the focused key and the input came from the keyboard
    // (§2, `isFocusVisibleWithin`).
    isFocusVisibleWithin: isFocusVisible,
    selectionMode: state.selectionMode,
    selectionBehavior: state.selectionBehavior,
    isDragging: () => undefined,
    isDropTarget: () => undefined,
    id: key,
    isExpanded,
    hasChildItems,
    level,
    state,
  };

  const resolvedClassName = () => {
    const className = local.className;

    return typeof className === "function"
      ? (className as (values: TableRowRenderProps) => string | undefined)(renderProps)
      : className;
  };

  const resolvedStyle = () => {
    const style = local.style;

    return typeof style === "function"
      ? (style as (values: TableRowRenderProps) => StyleProp<ViewStyle>)(renderProps)
      : style;
  };

  const stateClasses = computed(() =>
    [
      // R-034 (last row drops its border) is inert for the reason R-033 gives:
      // the row has no painted border to drop, and the cells' borders are the
      // separator on every row.
      //
      // R-039 (`data-dragging` opacity) and R-040 (a drop target's cell
      // surface) are drag-and-drop states; `dragAndDropHooks` has no NSH
      // channel and the states never occur (§8).
      //
      // R-037: a disabled row is dimmed and takes nothing.
      isDisabled() ? "opacity-50 cursor-not-allowed" : "",
      // R-038: upstream only cancels the browser's outline.
      "outline-none",
    ]
      .filter(Boolean)
      .join(" "),
  );

  const runAction = () => {
    if (isDisabled()) {
      return;
    }

    if (state.selectionMode() !== "none") {
      state.rowSelectionManager.select(key);
    } else {
      local.onAction?.();
      table.onRowAction(key);
    }
  };

  const handlePressDown = (event: PressEvent) => {
    isPressed.set(true);
    // R-013: a keyboard activation is a press on the focused view; the input
    // modality follows the source of the press.
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

    // A press on a cell of this row was handled there; the bubbling copy is
    // not a second activation.
    if (!claimPress(event)) {
      local.onPress?.(event);
      return;
    }

    state.noteFocus();
    state.focusView(key, state.focusedColumnIndex() ?? 0);
    runAction();
    local.onPress?.(event);
  };

  const contextValue = {
    rowKey: key,
    level: level(),
    nextCellIndex: () => nextCell++,
  };

  // A tree row renders inside its parent row (port sheet §3): it has to span
  // every column of the parent's grid, so it sits on a line of its own with
  // the same tracks, exactly where the collection puts it below the parent.
  const rowStyle = computed(() => {
    const tracks = layout.tracks() || "1fr";

    return parentRow
      ? { gridColumn: "1 / -1", gridTemplateColumns: tracks }
      : { gridTemplateColumns: tracks };
  });

  return (
    <TableRowContext.Provider value={contextValue}>
      <View
        {...(rest as any)}
        ref={(view) => {
          node = view;
          local.ref?.(view);
        }}
        nativeID={local.id}
        role="row"
        focusable={state.isCellFocusable()}
        disabled={isDisabled()}
        accessibilityState={{
          selected: isSelected(),
          disabled: isDisabled(),
          expanded: hasChildItems() ? isExpanded() : undefined,
        }}
        onLayout={(event) => {
          state.registerRowLayout(key, event.bounds);
          local.onLayout?.(event);
        }}
        onFocus={() => {
          state.noteFocus();
        }}
        onBlur={() => {
          state.noteBlur();
        }}
        onMouseEnter={(event) => {
          isHovered.set(true);
          local.onHoverChange?.(true);
          local.onMouseEnter?.(event);
        }}
        onMouseLeave={(event) => {
          isHovered.set(false);
          local.onHoverChange?.(false);
          local.onMouseLeave?.(event);
        }}
        onPressDown={handlePressDown}
        onPressUp={handlePressUp}
        onPress={handlePress}
        class={[slots().row(), "group grid", stateClasses(), resolvedClassName()]
          .filter(Boolean)
          .join(" ")}
        style={[rowStyle(), resolvedStyle()]}
      >
        {renderPartChildren(local.children as JSX.Element, renderProps)}
        {/* R-045–R-048: one inset ring for the whole row while a cell of it
            has the keyboard focus. R-046 is the left segment, R-047 the right
            one and R-048 the middle cells' top and bottom edges; the single
            ring covers all three segments at once. */}
        <If when={isFocusVisible()}>
          <View class="pointer-events-none absolute inset-0 rounded-lg inset-ring-2 inset-ring-focus" />
        </If>
      </View>
    </TableRowContext.Provider>
  );
}
