import type { JSX } from "nsh";
import { View } from "nsh";

import type { ModalPartDomProps } from "./modal-dom-props";

/**
 * The props of `Modal.Header`: HeroUI's `DOMRenderProps<'div', undefined>`
 * plus `children` and `className`.
 *
 * STUB: the final body (slot classes and the R-058 / R-059 registration) is
 * written by its part group.
 */
export interface ModalHeaderProps extends ModalPartDomProps {}

/** Modal.Header / ModalHeader: the header row holding the icon and title. */
export function ModalHeader(props: ModalHeaderProps): JSX.Element {
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
