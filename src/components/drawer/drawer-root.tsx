import type { JSX } from "nsh";

import { OverlayTriggerContext } from "../../primitives/create-overlay-trigger";
import type { DrawerState } from "./create-drawer-state";
import { createDrawerState } from "./create-drawer-state";
import { createDrawerContextValue, DrawerContext } from "./drawer-context";
import type { DrawerPlacement, DrawerVariants } from "./drawer.styles";

export interface DrawerRootProps {
  children: JSX.Element;
  /** The edge the panel comes from. `Drawer.Content`'s own `placement` wins. */
  placement?: DrawerPlacement;
  /** The backdrop paint model. `Drawer.Backdrop`'s own `variant` wins. */
  variant?: DrawerVariants["variant"];
  isOpen?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
  state?: DrawerState;
  ref?: (node: unknown) => void;
}

export function DrawerRoot(props: DrawerRootProps): JSX.Element {
  const state = createDrawerState({
    defaultOpen: () => props.defaultOpen,
    isOpen: () => props.isOpen,
    onOpenChange: props.onOpenChange,
    state: props.state,
  });
  // The placement sits on the root as well as on the content: the dialog is a
  // child element built before the content's provider is read, so it sees this
  // one, and the content's own `placement` still wins where it is set.
  const value = createDrawerContextValue({
    isOpen: state.isOpen,
    setOpen: state.setIsOpen,
    placement: () => props.placement,
    variant: () => props.variant,
  });
  return (
    <OverlayTriggerContext.Provider value={state.context}>
      <DrawerContext.Provider value={value}>{props.children}</DrawerContext.Provider>
    </OverlayTriggerContext.Provider>
  );
}
