import type { JSX, MouseEvent, PanEvent, PressEvent, ViewRef } from "nsh";
import { cleanup, computed, signal, split, View } from "nsh";

import { createKeymapScope, isKeyboardPress } from "../../primitives";
import { TableColumnContext, TableStateContext } from "./table-context";
import { type TablePartProps } from "./table-props";
import { useTableSlots } from "./table-slots";

export interface TableColumnResizerProps extends TablePartProps {
  "aria-label"?: string;

  children?: JSX.Element;
}

/** One keyboard step, in points (the port sheet's 10px step, §2). */
const KEYBOARD_STEP = 10;

/**
 * `Table.ColumnResizer` / `TableColumnResizer`: the transparent 17px hit area
 * at the column's end, with the 1px bar inside it (R-052 / R-053). NSH has no
 * `background-clip`, so the two have to be two views: the outer one takes the
 * pointer and the keyboard and stays transparent, the inner one carries the
 * colour and the width the states change.
 *
 * Dragging is a press followed by mouse moves with the button held (a pan ends
 * with the release); the keyboard is React Aria's hidden range input replaced
 * by a keymap scope: Return starts resizing, the arrows move 10 points, Escape
 * / Return / Space end it and give the focus back to the column, and Tab is the
 * platform's (it moves the focus away, and `onBlur` ends the resize).
 */
export function TableColumnResizer(props: TableColumnResizerProps) {
  const [local, rest] = split(props, [
    "children",
    "className",
    "style",
    "ref",
    "id",
    "aria-label",
    "render",
    "items",
    "dependencies",
    "onLayout",
    "onPress",
    "onPressDown",
    "onPressUp",
    "onMouseEnter",
    "onMouseLeave",
    "onMouseMove",
    "onFocus",
    "onBlur",
    "onPanStart",
    "onPanEnd",
  ] as const);

  const table = TableStateContext();
  const column = TableColumnContext();
  const slots = useTableSlots();

  if (!table || !column) {
    return null;
  }

  const { state, layout, modality } = table;

  let node: ViewRef | undefined;

  cleanup(column.registerResizer(() => node?.focus()));

  const hovered = signal(false);
  const focused = signal(false);
  const keyboardResizing = signal(false);

  let dragStartX: number | undefined;
  let dragStartWidth = 0;

  const columnModel = computed(() => state.collection().columnByKey.get(column.columnKey));

  const currentWidth = () => {
    const measured = layout.widths().get(column.columnKey);

    if (measured != null) {
      return measured;
    }

    const declared = columnModel()?.width;

    return typeof declared === "number" ? declared : 0;
  };

  const isResizing = computed(
    () => layout.resizingColumn() === column.columnKey || keyboardResizing(),
  );

  const isFocusVisible = computed(
    () => focused() && (table.isKeyboard() || keyboardResizing()),
  );

  const active = computed(() => hovered() || isResizing() || isFocusVisible());

  const beginDrag = (event: PressEvent) => {
    if (isKeyboardPress(event)) {
      // Return / Space on the focused hit area starts the keyboard resize,
      // React Aria's `setKeyboardNavigationDisabled(true)`.
      modality.setKeyboardModality();
      keyboardResizing.set(true);
      layout.beginResize(column.columnKey);
      return;
    }

    modality.setPointerModality();
    dragStartX = event.pagePosition.x;
    dragStartWidth = currentWidth();
    layout.beginResize(column.columnKey);
  };

  const endDrag = () => {
    if (layout.resizingColumn() != null) {
      layout.endResize();
    }

    dragStartX = undefined;
  };

  const handleMouseMove = (event: MouseEvent) => {
    if (dragStartX != null && event.pressedButton === "left") {
      layout.resizeTo(column.columnKey, dragStartWidth + (event.pagePosition.x - dragStartX));
    }

    local.onMouseMove?.(event);
  };

  const handlePanEnd = (event: PanEvent) => {
    if (dragStartX != null && !event.cancelled) {
      layout.resizeTo(column.columnKey, dragStartWidth + event.translation.x);
    }

    endDrag();
    local.onPanEnd?.(event);
  };

  const resizeBy = (delta: number) => {
    const width = currentWidth();

    layout.resizeTo(column.columnKey, (width || columnModel()?.minWidth || 0) + delta);
  };

  const stopKeyboardResize = () => {
    keyboardResizing.set(false);
    endDrag();
    // The focus goes back to the column header, as React Aria restores its
    // `triggerRef`.
    state.focusColumn(column.columnKey);
  };

  createKeymapScope({
    isActive: () => keyboardResizing(),
    bindings: {
      left: () => resizeBy(-KEYBOARD_STEP),
      right: () => resizeBy(KEYBOARD_STEP),
      escape: () => stopKeyboardResize(),
      enter: () => stopKeyboardResize(),
      space: () => stopKeyboardResize(),
    },
    options: { repeat: true },
  });

  const classes = computed(() =>
    [
      // R-053: the transparent hit area: 1px content + 8px on each side.
      "absolute end-0 top-1/2 flex h-4 w-[17px] -translate-y-1/2 translate-x-1/2 flex-col items-center justify-center cursor-col-resize outline-none",
      // R-054 / R-055 / R-056: the hit area grows to the column's height.
      active() ? "h-full" : "",
      local.className as string | undefined,
    ]
      .filter(Boolean)
      .join(" "),
  );

  const barClasses = computed(() =>
    [
      slots().columnResizer(),
      // R-055: while dragging, the bar is accent coloured and 2px wide.
      isResizing() ? "h-full w-0.5 bg-accent" : "",
      // R-056: the keyboard focus takes the theme's focus colour.
      !isResizing() && isFocusVisible() ? "h-full w-0.5 bg-focus" : "",
      // R-054: hovering widens and tints the bar too.
      !isResizing() && !isFocusVisible() && hovered() ? "h-full w-0.5 bg-accent" : "",
    ]
      .filter(Boolean)
      .join(" "),
  );

  return (
    <View
      {...(rest as any)}
      ref={(view) => {
        node = view;
        local.ref?.(view);
      }}
      nativeID={local.id}
      focusable
      accessibilityLabel={local["aria-label"]}
      role="adjustable"
      accessibilityValue={{ text: `${Math.round(currentWidth())} px` }}
      onLayout={local.onLayout}
      onFocus={() => {
        focused.set(true);
        state.noteFocus();
        local.onFocus?.();
      }}
      onBlur={() => {
        focused.set(false);

        if (keyboardResizing()) {
          keyboardResizing.set(false);
        }

        endDrag();
        state.noteBlur();
        local.onBlur?.();
      }}
      onMouseEnter={(event) => {
        hovered.set(true);
        local.onMouseEnter?.(event);
      }}
      onMouseLeave={(event) => {
        hovered.set(false);
        local.onMouseLeave?.(event);
      }}
      onMouseMove={handleMouseMove}
      onPressDown={(event) => {
        beginDrag(event);
        local.onPressDown?.(event);
      }}
      onPressUp={(event) => {
        if (!keyboardResizing()) {
          endDrag();
        }

        local.onPressUp?.(event);
      }}
      onPress={(event) => local.onPress?.(event)}
      onPanStart={(event) => {
        dragStartX = dragStartX ?? 0;
        dragStartWidth = currentWidth();
        layout.beginResize(column.columnKey);
        local.onPanStart?.(event);
      }}
      onPanEnd={handlePanEnd}
      class={classes()}
      style={local.style as any}
    >
      {local.children as JSX.Element}
      <View accessibilityElementsHidden class={barClasses()} />
    </View>
  );
}
