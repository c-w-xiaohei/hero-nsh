import type { GestureResponderEvent, JSX } from "nsh";
import { split, View } from "nsh";

import { SheetDetentContext } from "./create-sheet-detent";
import type { SheetPartDomProps } from "./sheet-dom-props";
import { viewProps } from "./sheet-dom-props";
import { renderSheetPartChildren } from "./sheet-part-children";
import { SheetContext } from "./sheet-context";
import { SHEET_HANDLE_DRAGGING_CLASS, sheetVariants } from "./sheet.styles";

/**
 * The props of `Sheet.Handle`: HeroUI's `ComponentPropsWithRef<"div">`, whose
 * `onPointerDown` / `Move` / `Up` / `Cancel` / `LostPointerCapture` callbacks
 * have no NSH counterpart and are accepted without effect (port sheet §8). The
 * drag itself is the responder channel `ViewProps` already carries.
 */
export interface SheetHandleProps extends SheetPartDomProps {
  /** Accepted, no effect: NSH has no pointer capture. */
  onLostPointerCapture?: (event: unknown) => void;

  /** Accepted, no effect: the responder's terminate is not this event. */
  onPointerCancel?: (event: unknown) => void;

  /** Accepted, no effect: the drag starts from `onResponderGrant`. */
  onPointerDown?: (event: unknown) => void;

  /** Accepted, no effect: the drag follows `onResponderMove`. */
  onPointerMove?: (event: unknown) => void;

  /** Accepted, no effect: the release is `onResponderRelease`. */
  onPointerUp?: (event: unknown) => void;
}

/**
 * Sheet.Handle / SheetHandle: the drag handle and its bar (R-034, R-035,
 * R-037).
 *
 * Upstream `useSheetHandleDrag` moves React Aria's scroll offset with the
 * pointer; here the pointer feeds `SheetDetentContext`'s responder channel,
 * which moves the reveal length and settles on release with the same numeric
 * policies (`nearestSheetSnap`, `sheetDismissTarget`, the release curve). The
 * drag follows the axis the swipe direction names, which is why the axis comes
 * from the detent state rather than from the placement (T-014).
 */
export function SheetHandle(props: SheetHandleProps): JSX.Element {
  const [local, rest] = split(props, [
    "children",
    "className",
    "style",
    "ref",
    "id",
    "nativeID",
    "accessibilityElementsHidden",
    "onLostPointerCapture",
    "onPointerCancel",
    "onPointerDown",
    "onPointerMove",
    "onPointerUp",
    "onStartShouldSetResponder",
    "onResponderGrant",
    "onResponderMove",
    "onResponderRelease",
    "onResponderTerminate",
  ]);

  const context = SheetContext();
  const detent = SheetDetentContext();

  const slots = () => context?.slots() ?? sheetVariants();

  // R-034 `relative flex shrink-0 cursor-grab items-center justify-center py-3
  // select-none` plus `flex-row` (a view is a column by default) are the slot.
  // Its `touch-none` is not written: NSH exposes neither the `touch-*` class nor
  // a `touchAction` style, and no scroll view in the handle's ancestry could
  // take the gesture — the responder below owns it (port sheet §8).
  const classes = () => [slots().handle(), local.className].filter(Boolean).join(" ");

  /** The pointer coordinate the drag reads: the swipe direction's axis. */
  const position = (event: GestureResponderEvent) =>
    detent?.axis() === "x" ? event.pageX : event.pageY;

  const content = () => {
    const node = local.children;

    // R-037: the bar is a real child view, drawn when the caller gave none.
    if (node === undefined || node === null) {
      return <View class={slots().handleBar()} />;
    }

    return renderSheetPartChildren(node);
  };

  return (
    <View
      {...viewProps(rest)}
      ref={(node) => local.ref?.(node)}
      nativeID={local.id ?? local.nativeID}
      // Upstream hardcodes `aria-hidden="true"` and lets the spread restate it.
      accessibilityElementsHidden={local.accessibilityElementsHidden ?? true}
      class={classes()}
      // R-035 `.sheet__handle[data-dragging]` → `cursor-grabbing`, after the
      // slot's `cursor-grab` so it wins while the drag runs.
      classList={{ [SHEET_HANDLE_DRAGGING_CLASS]: detent?.dragging() ?? false }}
      style={local.style}
      // Claiming the press is what makes the moves arrive; a caller's own
      // predicate still decides when it gives one.
      onStartShouldSetResponder={(event, gestureState) =>
        local.onStartShouldSetResponder?.(event, gestureState) ?? detent !== null
      }
      // Each step calls the caller's responder callback first, as upstream calls
      // the DOM pointer callback before its own drag step.
      onResponderGrant={(event) => {
        local.onResponderGrant?.(event);
        detent?.beginDrag(position(event), event.timestamp);
      }}
      onResponderMove={(event) => {
        local.onResponderMove?.(event);
        detent?.moveDrag(position(event), event.timestamp);
      }}
      onResponderRelease={(event) => {
        local.onResponderRelease?.(event);
        detent?.endDrag(position(event), event.timestamp);
      }}
      onResponderTerminate={(event) => {
        local.onResponderTerminate?.(event);
        detent?.cancelDrag();
      }}
    >
      {content()}
    </View>
  );
}
