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
import { createInput } from "../../primitives/environment";
import { createPan } from "../../primitives/pan";
import { createPressFeedback } from "../../primitives/pressable";
import { renderPartChildren } from "./table-children";
import {
  TableColumnContext,
  TableContext,
  TableResizerContext,
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

  // A-004 / A-005 / A-006: the `input` axis feeds the touch-only seams of
  // this part — the `createPressFeedback` hit-area expansion, the
  // `createPan` horizontal-claim drag and the hover suppression below.
  const input = createInput();

  // A-004: the press-feedback seam, consuming only its `hitSlop`/`layout`
  // half-channels (the slider A-001 precedent): the 17 px hit band has no
  // press-visual contract of its own — begin/end drag is the existing
  // channel — so `pressDown`/`pressUp`/`scale` and the
  // `PressableFeedbackContext` provider stay unwired. Under `touch` the
  // computed slop pads the band's sides out to ≥44 pt; under `pointer`
  // the accessor answers `undefined` and nothing changes.
  const feedback = createPressFeedback({
    enabled: () => input() === "touch",
  });

  let dragStartX: number | undefined;
  let dragStartWidth = 0;
  /**
   * A pan owns the current press: `onPressUp` fires before `onPanEnd` (the
   * measured order is press-up, then pan-end), so ending the drag there would
   * clear the start before the pan reports its translation. The press-up ends
   * the drag only when no pan followed it.
   */
  let panActive = false;
  // A-005: whether a gesture was ever claimed this press (JS pan or native
  // `onPan*`), and whether any move travelled — the two vetoes of the tap
  // synthesis `onPressUp` performs under touch (a vertical drag the pan
  // yields to the Scroll, or a claimed-then-terminated gesture, must not
  // report a `begin`/`end` pair).
  let panClaimed = false;
  let gestureTravelled = false;
  // The press-down position, for the tap displacement check.
  let pressPosition: { x: number; y: number } | undefined;

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
    panClaimed = false;
    gestureTravelled = false;
    pressPosition = event.pagePosition;
    dragStartX = event.pagePosition.x;
    dragStartWidth = currentWidth();

    // A-005: under touch the JS pan owns the drag, so `beginResize` is
    // deferred to its `onDragStart` — a vertical gesture the claim yields to
    // the Scroll would otherwise leave a residual `resizingColumn` behind
    // (which also disables the grid keymap through `keysFree`). The pointer
    // chain keeps the press-time `onResizeStart` it always had.
    if (input() !== "touch") {
      layout.beginResize(column.columnKey);
    }
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
    // Mounted for the pointer path only (see the JSX gate): under touch the
    // JS `createPan` owns every side of the drag.
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

  // A-005: the touch drag path. `createPan` claims on the first move frame
  // whose travel is more horizontal than vertical — no displacement
  // threshold, which would let the claim arrive late enough to hand the
  // responder to nothing (the sheet-handoff §5 dead-lock measurement). A
  // first-frame vertical gesture fails `shouldClaim` and the touch falls
  // through to the outer Scroll untouched. `onDrag*` mirror the existing
  // `onPan*` body's semantics one for one: the drag start begins the resize,
  // each frame writes `dragStartWidth + dx` and the end commits the release
  // translation (or only restores on a terminate). Under `pointer` the seam
  // is disabled and `panHandlers()` spreads nothing at all.
  const pan = createPan({
    enabled: () => input() === "touch",
    shouldClaim: (_event, gesture) => {
      if (gesture.dx !== 0 || gesture.dy !== 0) {
        gestureTravelled = true;
      }

      return gesture.dx !== 0 && Math.abs(gesture.dx) > Math.abs(gesture.dy);
    },
    onDragStart: () => {
      panActive = true;
      panClaimed = true;
      dragStartX = dragStartX ?? 0;
      dragStartWidth = currentWidth();

      // The press already began the resize only on the pointer path; on
      // touch this claim is what begins it, and a gesture that claimed after
      // a stray native `onPanStart` must not report a second `onResizeStart`.
      if (layout.resizingColumn() !== column.columnKey) {
        layout.beginResize(column.columnKey);
      }
    },
    onDrag: (_event, gesture) => {
      if (dragStartX == null) {
        return;
      }

      layout.resizeTo(column.columnKey, dragStartWidth + gesture.dx);
    },
    onDragEnd: (_event, gesture, terminated) => {
      if (dragStartX != null && !terminated) {
        layout.resizeTo(column.columnKey, dragStartWidth + gesture.dx);
      }

      endDrag();
    },
  });

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
      onLayout={(event) => {
        // A-004: the measured band feeds the seam's `hitSlop` computation.
        feedback.layout(event);
        local.onLayout?.(event);
      }}
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
        // A-006: under touch the hover state stays off entirely — the raw
        // host callbacks still forward.
        if (input() !== "touch") {
          hovered.set(true);
        }
        local.onMouseEnter?.(event);
      }}
      onMouseLeave={(event) => {
        if (input() !== "touch") {
          hovered.set(false);
        }
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
          // A-005: under touch `beginResize` is deferred to the pan's claim,
          // so a zero-displacement tap would otherwise never report the
          // `onResizeStart`/`onResizeEnd` pair a desktop tap reports. The
          // pair is synthesized here — but only for a real tap: a claimed
          // pan, a yielded vertical drag (`gestureTravelled`) or an event
          // whose position moved off the press point is not a tap.
          if (
            input() === "touch" &&
            !panClaimed &&
            !gestureTravelled &&
            pressPosition != null &&
            Math.abs((event.pagePosition?.x ?? pressPosition.x) - pressPosition.x) <= 2 &&
            Math.abs((event.pagePosition?.y ?? pressPosition.y) - pressPosition.y) <= 2
          ) {
            layout.beginResize(column.columnKey);
          }

          endDrag();
        }

        local.onPressUp?.(event);
      }}
      onPress={(event) => {
        claimPress(event);
        local.onPress?.(event);
      }}
      // A-005: under touch the native `onPan*` props stay unmounted — the
      // measured host attaches a real recognizer to them that claims any
      // drag on the hit area (a vertical drag included) and never yields
      // it to the outer Scroll, so a yielded gesture would die in the
      // resizer (the M-008 dead-gesture measurement). The props are the
      // pointer path's and mount exactly as before there; under touch the
      // JS `createPan` owns the drag semantics and `local.onPan*` is a
      // channel touch does not guarantee (§6).
      onPanStart={
        input() === "touch"
          ? undefined
          : (event: PanEvent) => {
              panActive = true;
              panClaimed = true;
              dragStartX = dragStartX ?? 0;
              dragStartWidth = currentWidth();

              // The press already began the resize; the pan is the same
              // gesture and must not report a second `onResizeStart`.
              if (layout.resizingColumn() !== column.columnKey) {
                layout.beginResize(column.columnKey);
              }

              local.onPanStart?.(event);
            }
      }
      onPanEnd={input() === "touch" ? undefined : handlePanEnd}
      {...pan.panHandlers()}
      // A-004: the touch hit-area expansion — `undefined` under pointer, so
      // the desktop band keeps its exact 17 px contract.
      hitSlop={feedback.hitSlop()}
      class={classes()}
      style={resolvedStyle()}
    >
      <TableResizerContext.Provider
        value={{ enabled: () => input() === "touch", feedback, pan }}
      >
        {renderPartChildren(local.children as JSX.Element, renderProps)}
      </TableResizerContext.Provider>
      <View accessibilityElementsHidden class={barClasses()} />
    </View>
  );
}
