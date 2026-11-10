import type { JSX, StyleProp, ViewStyle } from "nsh";
import { View } from "nsh";

import type { ModalBackdropProps } from "./modal-backdrop";
import type { ModalRenderValues } from "./modal-render-values";
import type { ModalPlacement, ModalVariants } from "./modal.styles";

/**
 * The props of `Modal.Container`: HeroUI's `ModalContainerProps`, which is
 * React Aria's inner `Modal` (the backdrop's props without `children` and
 * `className`) plus `placement`, `scroll` and `size`.
 *
 * STUB: the final body (the carrier classes of R-008 / R-009 / R-029, the
 * presence-driven entering classes of R-021 … R-025 / R-031, and writing
 * `size` / `scroll` into the context for the parts below) is written by its
 * part group. The props type below is final.
 */
export interface ModalContainerProps
  extends Omit<ModalBackdropProps, "children" | "className" | "style"> {
  children?: JSX.Element | ((values: ModalRenderValues) => JSX.Element);

  /** Appended after the slot classes; later classes win. */
  className?: string;

  style?: StyleProp<ViewStyle>;

  /** Where the dialog sits vertically. @default "auto" */
  placement?: ModalPlacement;

  /** Which element scrolls. @default "inside" */
  scroll?: ModalVariants["scroll"];

  /** The dialog's maximum width, or its full / cover box. @default "md" */
  size?: ModalVariants["size"];
}

/** Modal.Container / ModalContainer: the positioning wrapper for the dialog. */
export function ModalContainer(props: ModalContainerProps): JSX.Element {
  const content = () => {
    const node = props.children;

    return typeof node === "function" && node.length >= 1
      ? (node as (values: ModalRenderValues) => JSX.Element)({
          isEntering: () => false,
          isExiting: () => false,
          state: { isOpen: () => false, open: () => {}, close: () => {}, toggle: () => {} },
        })
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
