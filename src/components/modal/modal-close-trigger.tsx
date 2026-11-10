import type { JSX, PressEvent } from "nsh";

import type { CloseButtonRenderProps, CloseButtonRootProps } from "../close-button";
import { CloseButton } from "../close-button";
import { ModalContext } from "./modal-context";
import type { ModalSlots } from "./modal.styles";
import { modalVariants } from "./modal.styles";

/**
 * The props of `Modal.CloseTrigger`: HeroUI's
 * `ComponentPropsWithRef<typeof ButtonPrimitive>` plus `className` and
 * `children`. `CloseButton` already carries that surface (and the default
 * close icon), so the type reuses it.
 */
export interface ModalCloseTriggerProps extends CloseButtonRootProps {}

/**
 * Modal.CloseTrigger / ModalCloseTrigger: HeroUI's `CloseButton` with
 * `slot="close"`. NSH has no slot collection, so the part closes through the
 * Modal context itself before it calls the caller's `onPress`.
 */
export function ModalCloseTrigger(props: ModalCloseTriggerProps): JSX.Element {
  const context = ModalContext();

  // Outside a Root the part still renders the table's default corner classes,
  // as upstream's empty context default does.
  const slots = (): ModalSlots => context?.slots() ?? modalVariants();

  // R-057: `.modal__close-trigger` → `absolute end-4 top-4`. Upstream resolves
  // a render-prop `className` against the slot classes
  // (`useResolvedClassName`), so the function form has to compose too.
  const resolvedClassName = () => {
    const slotClasses = slots().closeTrigger();
    const className = props.className;

    if (typeof className === "function") {
      return (values: CloseButtonRenderProps) =>
        [slotClasses, className(values)]
          .filter((part): part is string => typeof part === "string" && part.length > 0)
          .join(" ");
    }

    return [slotClasses, className]
      .filter((part): part is string => typeof part === "string" && part.length > 0)
      .join(" ");
  };

  // The slot's close channel runs before the element's own `onPress`.
  const handlePress = (event: PressEvent) => {
    context?.close();
    props.onPress?.(event);
  };

  return (
    <CloseButton
      data-slot="modal-close-trigger"
      slot="close"
      {...props}
      className={resolvedClassName()}
      onPress={handlePress}
    />
  );
}
