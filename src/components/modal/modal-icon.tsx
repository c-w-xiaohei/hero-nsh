import type { JSX } from "nsh";
import { View } from "nsh";

import type { ModalPartDomProps } from "./modal-dom-props";

/**
 * The props of `Modal.Icon`: HeroUI's `DOMRenderProps<'div', undefined>` plus
 * `children` and `className`.
 *
 * STUB: the final body (the icon box slot classes) is written by its part
 * group.
 */
export interface ModalIconProps extends ModalPartDomProps {}

/** Modal.Icon / ModalIcon: the optional icon above the title. */
export function ModalIcon(props: ModalIconProps): JSX.Element {
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
