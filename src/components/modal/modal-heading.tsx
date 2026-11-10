import type { JSX } from "nsh";
import { View } from "nsh";

import type { ModalPartDomProps } from "./modal-dom-props";

/**
 * The props of `Modal.Heading`: HeroUI's `ComponentPropsWithRef<typeof
 * HeadingPrimitive>`, which adds `level` (default 3) to the section's props.
 *
 * STUB: the final body (`role="header"`, `accessibilityLevel={level}` and the
 * `slot="title"` no-op) is written by its part group.
 */
export interface ModalHeadingProps extends ModalPartDomProps {
  /** The heading level upstream writes as `h{level}`. @default 3 */
  level?: number;
}

/** Modal.Heading / ModalHeading: the dialog's title. */
export function ModalHeading(props: ModalHeadingProps): JSX.Element {
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
