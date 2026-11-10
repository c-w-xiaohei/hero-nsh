import type { JSX } from "nsh";

import type { CloseButtonRootProps } from "../close-button";
import { CloseButton } from "../close-button";

/**
 * The props of `Modal.CloseTrigger`: HeroUI's
 * `ComponentPropsWithRef<typeof ButtonPrimitive>` plus `className` and
 * `children`. `CloseButton` already carries that surface (and the default
 * close icon), so the type reuses it.
 *
 * STUB: the final body (the `closeTrigger` slot classes and closing through
 * the Modal context before the caller's `onPress`) is written by its part
 * group.
 */
export interface ModalCloseTriggerProps extends CloseButtonRootProps {}

/** Modal.CloseTrigger / ModalCloseTrigger: the corner close button. */
export function ModalCloseTrigger(props: ModalCloseTriggerProps): JSX.Element {
  return <CloseButton {...props} />;
}
