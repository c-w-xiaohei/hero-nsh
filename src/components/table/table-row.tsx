import type { JSX, PressEvent, StyleProp, ViewRef, ViewStyle } from "nsh";
import { cleanup, computed, openUrl, signal, split, untracked, View } from "nsh";

import { isKeyboardPress } from "../../primitives";
import { TableSelectionCheckboxContext } from "../checkbox/table-selection-context";
import { renderChildren } from "./table-children";
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
  /** The columns a function child draws a cell for (React Aria's `columns`). */
  columns?: readonly unknown[];

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

  onHoverStart?: (event?: unknown) => void;
  onHoverEnd?: (event?: unknown) => void;
  onHoverChange?: (isHovering: boolean) => void;

  /**
   * The cells of the row. A function child renders one cell per entry of
   * `columns`, exactly as React Aria's `Row` does; the render-props function
   * is Cell's contract, not Row's.
   */
  children?: JSX.Element | ((item: unknown) => JSX.Element);
}

let generatedRowCount = 0;

/** `http:`, `mailto:`, `tel:` …: what `openUrl` accepts; `#anchor` is not. */
const ABSOLUTE_URL = /^[a-z][a-z0-9+.-]*:/i;

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
      // A row provides the context its cells read, so its children may only be
      // read inside that provider (`_common`, the children rule). The
      // collection derives a row's text from its first texted cell instead.
      textValue: () => local.textValue ?? "",
      hasChildItems: () => local.hasChildItems,
      isDisabled: () => local.isDisabled === true,
      ref: () => node,
    }),
  );

  const model = computed(() => state.collection().rowByKey.get(key));

  const isHovered = signal(false);
  const isPressed = signal(false);
  const isRowFocused = signal(false);

  const isSelected = computed(() => state.isSelected(key));
  // The selection manager is the source (§1, the tree's four values): it
  // covers the row's own `isDisabled` and `disabledKeys`, and it ignores both
  // while `disabledBehavior` is `"selection"` — such a row still acts, only
  // its selection is refused.
  const isDisabled = computed(() => state.isDisabled(key));
  const isExpanded = computed(() => state.isExpanded(key));
  const hasChildItems = computed(() => model()?.hasChildItems ?? local.hasChildItems === true);
  const level = computed(() => model()?.level ?? parentRow?.level ?? 1);

  // The row view is a Tab stop of its own (§8): while it holds the focus
  // itself, no cell of it is the focused cell yet, so the row's own signal
  // keeps R-045–R-048's ring and the row's render props honest.
  const isFocused = computed(() => isRowFocused() || state.focusedCellIn(key));
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

  // React Aria's `Row` draws one cell per entry of `columns` when its children
  // is a function; without `columns` the children is the static cell tree.
  const columnList = computed(
    () => (local.columns as readonly unknown[] | undefined) ?? [],
  );
  const hasColumns = computed(() => local.columns != null);

  const renderColumnCell = (column: unknown): JSX.Element => {
    const children = local.children;

    if (typeof children !== "function") {
      return null;
    }

    return renderChildren(
      untracked(() => (children as (item: unknown) => JSX.Element)(column)),
    );
  };

  // The one children read, at its placement (the compiler's zero-argument
  // reactive child passes through; a one-argument function is `columns`' form
  // and has nothing to draw without columns).
  const staticChildren = (): JSX.Element => {
    const children = local.children;

    if (typeof children === "function" && children.length >= 1) {
      return null;
    }

    return renderChildren(children as JSX.Element);
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
      // R-037: upstream's `status-disabled` — dimmed, the not-allowed cursor,
      // and inert. Written as literal values, the theme has no such variable.
      isDisabled() ? "opacity-50 cursor-not-allowed pointer-events-none" : "",
      // R-038: upstream only cancels the browser's outline.
      "outline-none",
    ]
      .filter(Boolean)
      .join(" "),
  );

  const isSelectable = () => state.selectionMode() !== "none";

  const runAction = () => {
    if (isDisabled()) {
      return;
    }

    const selectable = isSelectable();

    if (selectable) {
      state.rowSelectionManager.select(key);
    }

    // §1 events: a press reports the row action when the row cannot be
    // selected, and when `selectionBehavior` is `"replace"` (the press is the
    // action, and it also replaces the selection).
    if (!selectable || state.selectionBehavior() === "replace") {
      local.onAction?.();
      table.onRowAction(key);
    }
  };

  // `href` opens on press, as Link does: the host's opener takes an absolute
  // URL only, a relative path fires the handlers and stops there (§8).
  const followHref = () => {
    const href = local.href;

    if (href !== undefined && ABSOLUTE_URL.test(href)) {
      void openUrl(href).catch(() => {});
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
    // not a second activation. The row's own `onAction` and `href` still
    // apply to it, exactly as upstream's row-level handlers do.
    if (!claimPress(event)) {
      if (!isDisabled() && (!isSelectable() || state.selectionBehavior() === "replace")) {
        local.onAction?.();
      }

      followHref();
      local.onPress?.(event);
      return;
    }

    state.noteFocus();
    state.focusView(key, state.focusedColumnIndex() ?? 0);
    runAction();
    followHref();
    local.onPress?.(event);
  };

  // The cell cursor: each cell takes the next column index in render order,
  // past the columns a spanning cell already occupies (§4, `columnIndex`
  // respects col spanning). The cells of this row registered before the
  // caller are exactly its predecessors, so the cursor is their span total.
  const nextCellIndex = (): number =>
    untracked(() =>
      registry
        .cells()
        .filter((cell) => cell.rowKey === key)
        .reduce((total, cell) => total + Math.max(1, cell.colSpan()), 0),
    );

  const contextValue = {
    rowKey: key,
    level: level(),
    nextCellIndex,
  };

  // This row's `Checkbox slot="selection"` (port sheet table §5): its checked
  // state follows the row's selection, and a press toggles exactly this row.
  const selectionCheckbox = () => ({
    isSelected: state.isSelected(key),
    isIndeterminate: false,
    isDisabled: isDisabled(),
    onChange: (next: boolean) => {
      if (next !== state.isSelected(key)) {
        state.toggleRowSelection(key);
      }
    },
  });

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
    <TableSelectionCheckboxContext.Provider value={selectionCheckbox}>
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
            isRowFocused.set(true);
          }}
          onBlur={() => {
            state.noteBlur();
            isRowFocused.set(false);
          }}
          onMouseEnter={(event) => {
            isHovered.set(true);
            local.onHoverChange?.(true);
            local.onHoverStart?.(event);
            local.onMouseEnter?.(event);
          }}
          onMouseLeave={(event) => {
            isHovered.set(false);
            local.onHoverChange?.(false);
            local.onHoverEnd?.(event);
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
          {/* A function child draws one cell per column; a plain tree is the
              static form (port sheet §1, Row's children). */}
          <Each of={columnList()}>
            {(column) => renderColumnCell(column())}
          </Each>
          <If when={!hasColumns()}>{staticChildren()}</If>
          {/* R-045–R-048: one inset ring for the whole row while a cell of it
              has the keyboard focus. R-046 is the left segment, R-047 the right
              one and R-048 the middle cells' top and bottom edges; the single
              ring covers all three segments at once. */}
          <If when={isFocusVisible()}>
            <View class="pointer-events-none absolute inset-0 rounded-lg inset-ring-2 inset-ring-focus" />
          </If>
        </View>
      </TableRowContext.Provider>
    </TableSelectionCheckboxContext.Provider>
  );
}
