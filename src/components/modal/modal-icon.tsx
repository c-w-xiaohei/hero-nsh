import type { JSX } from "nsh";
import { computed, View } from "nsh";

import type { ModalPartDomProps } from "./modal-dom-props";
import { ModalContext } from "./modal-context";
import { modalVariants } from "./modal.styles";

/**
 * The props of `Modal.Icon`: HeroUI's `DOMRenderProps<'div', undefined>` plus
 * `children` and `className`.
 */
export interface ModalIconProps extends ModalPartDomProps {}

/**
 * Modal.Icon / ModalIcon: the optional icon above the title. R-052 gives it
 * `flex items-center justify-center size-10 shrink-0 rounded-3xl select-none`
 * from the `icon` slot, so it takes the themed square without any rule of its
 * own (port sheet §1.6).
 */
export function ModalIcon(props: ModalIconProps): JSX.Element {
  const modal = ModalContext();
  const slots = modal?.slots ?? modalVariants;

  const classes = computed(() =>
    [slots().icon(), props.className ?? ""].filter((part) => part !== "").join(" "),
  );

  return (
    <View
      ref={(node) => props.ref?.(node)}
      testID={props.testID}
      nativeID={props.id ?? props.nativeID}
      accessibilityLabel={props.accessibilityLabel}
      onLayout={props.onLayout}
      class={classes()}
      style={props.style}
    >
      {props.children}
    </View>
  );
}
