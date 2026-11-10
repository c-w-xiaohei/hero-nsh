import type { JSX, PressEvent } from "nsh";

import type { CloseButtonRenderProps, CloseButtonRootProps } from "../close-button";
import { CloseButton } from "../close-button";
import { DrawerContext } from "./drawer-context";
import { drawerVariants, type DrawerSlots } from "./drawer.styles";

export interface DrawerCloseTriggerProps extends CloseButtonRootProps {}

export function DrawerCloseTrigger(props: DrawerCloseTriggerProps): JSX.Element {
  const context = DrawerContext();
  const slots = (): DrawerSlots => context?.slots() ?? drawerVariants();

  // R-029: the close button occupies the logical top-end corner.
  const resolvedClassName = () => {
    const slotClasses = slots().closeTrigger();
    const className = props.className;
    if (typeof className === "function") {
      return (values: CloseButtonRenderProps) =>
        [slotClasses, className(values)].filter(Boolean).join(" ");
    }
    return [slotClasses, className].filter(Boolean).join(" ");
  };

  const handlePress = (event: PressEvent) => {
    context?.close();
    props.onPress?.(event);
  };

  return (
    <CloseButton
      {...props}
      data-slot="drawer-close-trigger"
      slot="close"
      className={resolvedClassName()}
      onPress={handlePress}
    />
  );
}
