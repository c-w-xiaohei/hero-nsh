import type { JSX } from "nsh";
import { View } from "nsh";

import type { ModalPartDomProps } from "./modal-dom-props";

/**
 * The props of `Modal.Footer`: HeroUI's `DOMRenderProps<'div', undefined>`
 * plus `children` and `className`.
 *
 * STUB: the final body (the footer slot classes and the R-059 / R-060 margin
 * when the Header or the Body registered before it) is written by its part
 * group.
 */
export interface ModalFooterProps extends ModalPartDomProps {}

/** Modal.Footer / ModalFooter: the dialog's action row. */
export function ModalFooter(props: ModalFooterProps): JSX.Element {
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
