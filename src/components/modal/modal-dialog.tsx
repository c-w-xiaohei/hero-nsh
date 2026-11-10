import type { JSX, StyleProp, ViewProps, ViewRef, ViewStyle } from "nsh";
import { View } from "nsh";

/**
 * The props of `Modal.Dialog`: HeroUI's `ModalDialogProps`, which is React
 * Aria's `DialogProps` (`AriaDialogProps + StyleProps + SlotProps +
 * DOMRenderProps<'section'>`).
 *
 * STUB: the final body (the `role="dialog"` view, the registration table for
 * R-058 … R-060, the `SurfaceContext` default and the `close` render prop) is
 * written by its part group. The props type below is final.
 */
export interface ModalDialogProps
  extends Omit<ViewProps, "children" | "class" | "ref" | "role" | "style"> {
  children?: JSX.Element | ((values: { close: () => void }) => JSX.Element);

  /** Appended after the slot classes; later classes win. */
  className?: string;

  style?: StyleProp<ViewStyle>;

  /** React Aria's role; NSH has no `dialog`, see port sheet §5.6. */
  role?: "alertdialog" | "dialog";

  /** Maps to `accessibilityLabel`. */
  "aria-label"?: string;

  /** Accepted, no effect: there is no id relation channel. */
  "aria-labelledby"?: string;

  /** Accepted, no effect: there is no id relation channel. */
  "aria-describedby"?: string;

  /** Accepted, no effect: NSH has no slot collection. */
  slot?: string;

  /** Accepted, no effect: NSH has no DOM element to replace. */
  render?: unknown;

  /** A DOM id upstream; maps to `nativeID`. */
  id?: string;

  /** Forwarded as a callback to the dialog's view. */
  ref?: (node: ViewRef) => void;

  /** Accepted, no effect: NSH has no DOM attribute channel. */
  [key: `data-${string}`]: unknown;
}

/** Modal.Dialog / ModalDialog: the card the modal shows. */
export function ModalDialog(props: ModalDialogProps): JSX.Element {
  const content = () => {
    const node = props.children;

    return typeof node === "function" && node.length >= 1
      ? (node as (values: { close: () => void }) => JSX.Element)({ close: () => {} })
      : (node as JSX.Element);
  };

  return (
    <View
      ref={(node) => props.ref?.(node)}
      testID={props.testID}
      nativeID={props.id ?? props.nativeID}
      class={props.className}
      style={props.style}
    >
      {content()}
    </View>
  );
}
