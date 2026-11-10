import type { JSX, StyleProp, ViewProps, ViewRef, ViewStyle } from "nsh";
import { View } from "nsh";

import type { ModalRenderValues } from "./modal-render-values";
import type { ModalVariants } from "./modal.styles";

/**
 * The props of `Modal.Backdrop`: HeroUI's `ModalBackdropProps`, which is
 * React Aria's `ModalOverlay` props plus `variant` and `isDismissable`.
 *
 * The overlay's own open channel (`isOpen` / `defaultOpen` / `onOpenChange`)
 * overrides the root's state while it is given, as RAC merges the two.
 *
 * STUB: the final body (nsh/base `Dialog`, the paint layer and its press, the
 * presence-driven classes of R-010 … R-012 and R-026 / R-027) is written by
 * its part group. The props type below is final.
 */
export interface ModalBackdropProps
  extends Omit<ViewProps, "children" | "class" | "ref" | "style"> {
  children?: JSX.Element | ((values: ModalRenderValues) => JSX.Element);

  /** Appended after the slot classes; later classes win. */
  className?: string | ((values: ModalRenderValues) => string);

  style?: StyleProp<ViewStyle> | ((values: ModalRenderValues) => StyleProp<ViewStyle>);

  /** The backdrop's paint. @default "opaque" */
  variant?: ModalVariants["variant"];

  /** Whether a press outside the dialog closes it. @default true */
  isDismissable?: boolean;

  /** Whether Escape and the back button close it. @default false */
  isKeyboardDismissDisabled?: boolean;

  /** The open state in controlled mode, over the root's. */
  isOpen?: boolean;

  /** The initial open state when there is no root. */
  defaultOpen?: boolean;

  /** Called on every change, with HeroUI's boolean payload. */
  onOpenChange?: (isOpen: boolean) => void;

  /** Forces the entering phase. */
  isEntering?: boolean;

  /** Forces the exiting phase. */
  isExiting?: boolean;

  /** Accepted, no effect: the host owns the overlay's animation. */
  onEnter?: (element?: unknown) => void | Promise<void>;

  /** Accepted, no effect: the host owns the overlay's animation. */
  onExit?: (element?: unknown) => void | Promise<void>;

  /** Accepted, no effect: there is no DOM element to test. */
  shouldCloseOnInteractOutside?: (element?: unknown) => boolean;

  /** Accepted, no effect: deprecated upstream, and NSH has no portal. */
  UNSTABLE_portalContainer?: unknown;

  /** Forwarded as a callback to the overlay's root view. */
  ref?: (node: ViewRef) => void;

  /** Accepted, no effect: NSH has no DOM element to replace. */
  render?: unknown;

  /** Accepted, no effect: NSH has no slot collection. */
  slot?: string;

  /** A DOM id upstream; maps to `nativeID`. */
  id?: string;

  /** Accepted, no effect: NSH has no DOM attribute channel. */
  [key: `data-${string}`]: unknown;
}

/** Modal.Backdrop / ModalBackdrop: the overlay behind the dialog. */
export function ModalBackdrop(props: ModalBackdropProps): JSX.Element {
  // The render values a function child, `className` and `style` hear. The
  // stub keeps them constant; the part group drives them from the presence.
  const values: ModalRenderValues = {
    isEntering: () => false,
    isExiting: () => false,
    state: { isOpen: () => false, open: () => {}, close: () => {}, toggle: () => {} },
  };

  const className = () =>
    typeof props.className === "function" ? props.className(values) : props.className;

  const style = () =>
    typeof props.style === "function" ? props.style(values) : props.style;

  const content = () => {
    const node = props.children;

    return typeof node === "function" && node.length >= 1
      ? (node as (values: ModalRenderValues) => JSX.Element)(values)
      : (node as JSX.Element);
  };

  return (
    <View
      ref={(node) => props.ref?.(node)}
      testID={props.testID}
      nativeID={props.id ?? props.nativeID}
      class={className()}
      style={style()}
    >
      {content()}
    </View>
  );
}
