import type { Accessor } from "nsh";
import { computed, context } from "nsh";

import type { DrawerPlacement, DrawerSlots, DrawerVariants } from "./drawer.styles";
import { drawerVariants } from "./drawer.styles";

export interface DrawerContextValue {
  slots: Accessor<DrawerSlots>;
  placement: Accessor<DrawerPlacement>;
  variant: Accessor<DrawerVariants["variant"]>;
  isDismissable: Accessor<boolean>;
  isOpen: Accessor<boolean>;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

export const DrawerContext = context<DrawerContextValue | null>(null);

export function createDrawerContextValue(options: {
  isOpen: Accessor<boolean>;
  setOpen: (open: boolean | ((previous: boolean) => boolean)) => void;
}): DrawerContextValue {
  const placement = () => "bottom" as const;
  const variant = () => "opaque" as const;
  const isDismissable = () => true;
  const value: DrawerContextValue = {
    slots: computed(() => drawerVariants({ placement: placement(), variant: variant() })),
    placement,
    variant,
    isDismissable,
    isOpen: options.isOpen,
    open: () => options.setOpen(true),
    close: () => options.setOpen(false),
    toggle: () => options.setOpen((previous) => !previous),
  };
  return value;
}
