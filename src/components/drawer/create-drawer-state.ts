import type { Accessor } from "nsh";

import { createOverlayTrigger } from "../../primitives/create-overlay-trigger";

export interface DrawerState {
  isOpen: Accessor<boolean> | boolean;
  setOpen: (open: boolean) => void;
}

export interface CreateDrawerStateProps {
  isOpen?: Accessor<boolean | undefined>;
  defaultOpen?: Accessor<boolean | undefined>;
  onOpenChange?: (isOpen: boolean) => void;
  state?: DrawerState;
}

export function createDrawerState(props: CreateDrawerStateProps) {
  const stateOpen = (): boolean | undefined => {
    const value = props.state?.isOpen;
    return typeof value === "boolean" ? value : value?.();
  };

  return createOverlayTrigger({
    isOpen: () => stateOpen() ?? props.isOpen?.(),
    defaultOpen: () => props.defaultOpen?.(),
    onOpenChange: (open) => {
      props.state?.setOpen(open);
      props.onOpenChange?.(open);
    },
  });
}
