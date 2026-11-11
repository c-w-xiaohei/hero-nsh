import type { JSX, PressEvent } from "nsh";

import type { CloseButtonRenderProps, CloseButtonRootProps } from "../close-button";
import { CloseButton } from "../close-button";
import { AlertDialogContext } from "./alert-dialog-context";
import type { AlertDialogSlots } from "./alert-dialog.styles";
import { alertDialogVariants } from "./alert-dialog.styles";

/**
 * The props of `AlertDialog.CloseTrigger`: HeroUI's
 * `ComponentPropsWithRef<typeof ButtonPrimitive>` plus `className` and
 * `children`. `CloseButton` already carries that surface (and the default close
 * icon), so the type reuses it.
 */
export interface AlertDialogCloseTriggerProps extends CloseButtonRootProps {}

/**
 * AlertDialog.CloseTrigger / AlertDialogCloseTrigger: HeroUI's `CloseButton`
 * with `slot="close"`. NSH has no slot collection, so the part closes through
 * the AlertDialog context itself before it calls the caller's `onPress`.
 */
export function AlertDialogCloseTrigger(props: AlertDialogCloseTriggerProps): JSX.Element {
  const context = AlertDialogContext();

  // Outside a Root the part still renders the table's default corner classes,
  // as upstream's empty context default does.
  const slots = (): AlertDialogSlots => context?.slots() ?? alertDialogVariants();

  // R-063: `.alert-dialog__close-trigger` → `absolute end-4 top-4`. Upstream
  // resolves a render-prop `className` against the slot classes
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
      data-slot="alert-dialog-close-trigger"
      slot="close"
      {...props}
      className={resolvedClassName()}
      onPress={handlePress}
    />
  );
}
