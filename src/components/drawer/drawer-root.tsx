import type { JSX } from "nsh";

import { OverlayTriggerContext } from "../../primitives/create-overlay-trigger";
import type { DrawerState } from "./create-drawer-state";
import { createDrawerState } from "./create-drawer-state";
import { createDrawerContextValue, DrawerContext } from "./drawer-context";

export interface DrawerRootProps {
  children: JSX.Element;
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
  const value = createDrawerContextValue({ isOpen: state.isOpen, setOpen: state.setIsOpen });
  return (
    <OverlayTriggerContext.Provider value={state.context}>
      <DrawerContext.Provider value={value}>{props.children}</DrawerContext.Provider>
    </OverlayTriggerContext.Provider>
  );
}
