import type {
  Accessor,
  JSX,
  MouseEvent,
  PanEvent,
  PressEvent,
  StyleProp,
  ViewRef,
  ViewStyle,
} from "nsh";
import { cleanup, computed, signal, split, View } from "nsh";

import { createKeymapScope, isKeyboardPress } from "../../primitives";
import { renderPartChildren } from "./table-children";
import {
  TableColumnContext,
  TableContext,
  TableStateContext,
  claimPress,
} from "./table-context";
import { type TablePartProps } from "./table-props";
import { useTableSlots } from "./table-slots";

/** The render values `Table.ColumnResizer`'s children / className / style receive (§1, §3). */
export interface TableColumnResizerRenderProps {
  isHovered: Accessor<boolean>;
  isFocused: Accessor<boolean>;
  isFocusVisible: Accessor<boolean>;
  isResizing: Accessor<boolean>;
  /** The edge the hit area sits on: `"right"` in LTR, `"left"` in RTL (§3). */
  resizableDirection: Accessor<"right" | "left" | "both">;
}

export interface TableColumnResizerProps extends TablePartProps {
  "aria-label"?: string;

  children?:
    | JSX.Element
    | ((values: TableColumnResizerRenderProps) => JSX.Element);

  className?:
    | string
    | ((values: TableColumnResizerRenderProps) => string | undefined);

  style?:
    | StyleProp<ViewStyle>
    | ((values: TableColumnResizerRenderProps) => StyleProp<ViewStyle>);
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
  const slotContext = TableContext();
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
  /**
   * A pan owns the current press: `onPressUp` fires before `onPanEnd` (the
   * measured order is press-up, then pan-end), so ending the drag there would
   * clear the start before the pan reports its translation. The press-up ends
   * the drag only when no pan followed it.
   */
  let panActive = false;

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

  // React Aria reads the locale's direction. NSH has no global one, so
  // `Table.Root`'s `dir` reaches this part through `TableContext`; the
  // resizer's own `direction` prop stays the fallback, and LTR is the default
  // (§3, §8).
  const resizableDirection = (): "right" | "left" | "both" =>
    (slotContext?.direction() ?? props.direction) === "rtl" ? "left" : "right";

  const renderProps: TableColumnResizerRenderProps = {
    isHovered: hovered,
    isFocused: focused,
    isFocusVisible,
    isResizing,
    resizableDirection,
  };

  const resolvedClassName = () => {
    const className = local.className;

    return typeof className === "function"
      ? (className as (values: TableColumnResizerRenderProps) => string | undefined)(
          renderProps,
        )
      : className;
  };

  const resolvedStyle = () => {
    const style = local.style;

    return typeof style === "function"
      ? (style as (values: TableColumnResizerRenderProps) => StyleProp<ViewStyle>)(
          renderProps,
        )
      : style;
  };

  const beginDrag = (event: PressEvent) => {
    // The press belongs to the resizer, not to the column that would sort.
    claimPress(event);

    if (isKeyboardPress(event)) {
      // Return / Space on the focused hit area starts the keyboard resize,
      // React Aria's `setKeyboardNavigationDisabled(true)`. A second Return is
      // the keymap's stop binding, not a restart.
      if (keyboardResizing()) {
        return;
      }

      modality.setKeyboardModality();
      keyboardResizing.set(true);
      layout.beginResize(column.columnKey);
      return;
    }

    modality.setPointerModality();
    // A pointer press focuses a view only when it is an Input in NSH; the
    // resizer takes the focus itself, as the hidden input does upstream. The
    // modality is the pointer's, so no focus ring appears (R-056).
    node?.focus();
    dragStartX = event.pagePosition.x;
    dragStartWidth = currentWidth();
    layout.beginResize(column.columnKey);
  };

  const endDrag = () => {
    if (layout.resizingColumn() != null) {
      layout.endResize();
    }

    dragStartX = undefined;
    panActive = false;
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
      // R-053: the transparent 17px hit area. Upstream straddles the column
      // edge (`end-0` + `translate-x-1/2`, 8px on each side); the host
      // hit-tests the transformed box, and the centre of a straddling box is
      // the boundary itself, which both grid frames claim half-open, so the
      // press lands on the next column. The band therefore sits fully inside
      // this column and the bar (pointer-events-none) keeps the edge position.
      "absolute end-0 top-1/2 flex h-4 w-[17px] -translate-y-1/2 flex-col items-center justify-center cursor-col-resize outline-none",
      // R-054 / R-055 / R-056: the hit area grows to the column's height.
      active() ? "h-full" : "",
      resolvedClassName(),
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
      nativeID={local.id ?? (rest as any).nativeID}
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
        claimPress(event);

        // A pan reports its own end after this event; only a press without a
        // pan is finished here (see `panActive`).
        if (!keyboardResizing() && !panActive) {
          endDrag();
        }

        local.onPressUp?.(event);
      }}
      onPress={(event) => {
        claimPress(event);
        local.onPress?.(event);
      }}
      onPanStart={(event) => {
        panActive = true;
        dragStartX = dragStartX ?? 0;
        dragStartWidth = currentWidth();

        // The press already began the resize; the pan is the same gesture and
        // must not report a second `onResizeStart`.
        if (layout.resizingColumn() !== column.columnKey) {
          layout.beginResize(column.columnKey);
        }

        local.onPanStart?.(event);
      }}
      onPanEnd={handlePanEnd}
      class={classes()}
      style={resolvedStyle()}
    >
      {renderPartChildren(local.children as JSX.Element, renderProps)}
      <View accessibilityElementsHidden class={barClasses()} />
    </View>
  );
}
