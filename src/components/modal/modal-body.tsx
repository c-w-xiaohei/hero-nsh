import type { JSX } from "nsh";
import { View } from "nsh";

import type { ModalPartDomProps } from "./modal-dom-props";

/**
 * The props of `Modal.Body`: HeroUI's `DOMRenderProps<'div', undefined>` plus
 * `children` and `className`.
 *
 * STUB: the final body (the body slot classes, `Scroll` for the `inside`
 * scroll variant of R-054, and the R-058 margin when the Header registered
 * before it) is written by its part group.
 */
export interface ModalBodyProps extends ModalPartDomProps {
  /** A DOM tab stop upstream; accepted without effect, a view is one or not. */
  tabIndex?: number;
}

/** Modal.Body / ModalBody: the dialog's content area. */
export function ModalBody(props: ModalBodyProps): JSX.Element {
  return (
    <View
      ref={(node) => props.ref?.(node)}
      testID={props.testID}
      nativeID={props.id ?? props.nativeID}
      class={props.className}
      style={props.style}
    >
      {props.children}
    </View>
  );
}
