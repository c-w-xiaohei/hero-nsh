import type { JSX } from "nsh";
import { split, View } from "nsh";

import type { SheetPartDomProps } from "./sheet-dom-props";
import { viewProps } from "./sheet-dom-props";
import { renderSheetPartChildren } from "./sheet-part-children";

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
 * Stub: the implemented part wires the responder channel to
 * `SheetDetentContext()`'s `beginDrag` / `moveDrag` / `endDrag` / `cancelDrag`,
 * renders the bar when it has no children, and calls a caller's DOM pointer
 * callback before its own drag step, as upstream does.
 */
export function SheetHandle(props: SheetHandleProps): JSX.Element {
  const [local, rest] = split(props, [
    "children",
    "className",
    "style",
    "ref",
    "id",
    "nativeID",
    "onLostPointerCapture",
    "onPointerCancel",
    "onPointerDown",
    "onPointerMove",
    "onPointerUp",
  ]);

  return (
    <View
      {...viewProps(rest)}
      ref={(node) => local.ref?.(node)}
      nativeID={local.id ?? local.nativeID}
      class={local.className}
      style={local.style}
    >
      {renderSheetPartChildren(local.children)}
    </View>
  );
}
