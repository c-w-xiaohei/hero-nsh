import type { AccessibilityRole, JSX } from "nsh";
import { View } from "nsh";

import type { ModalPartDomProps } from "./modal-dom-props";

/**
 * The props of `Modal.Trigger`: HeroUI's `ModalTriggerProps`, which is
 * `DOMRenderProps<'div', undefined>` plus `children` and `className`. The
 * press surface is NSH's host view props; `role` is `"button"` unless given.
 *
 * STUB: the final body (press toggling, trigger registration, focus ring and
 * the inline `transitionProperty` of R-003 / R-004) is written by its part
 * group. The props type below is final.
 */
export interface ModalTriggerProps extends ModalPartDomProps {
  /** HeroUI writes `role="button"` and lets the caller override it. */
  role?: AccessibilityRole;

  /** `aria-disabled` upstream; the trigger treats a press as blocked. */
  "aria-disabled"?: boolean;

  /** Maps to `accessibilityLabel`. */
  "aria-label"?: string;

  /** Maps to `accessibilityState.expanded`. */
  "aria-expanded"?: boolean;
}

/** Modal.Trigger / ModalTrigger: the pressable that opens the modal. */
export function ModalTrigger(props: ModalTriggerProps): JSX.Element {
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
