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
  /** The first frame after opening: the panel and backdrop still hold their off state. */
  isEntering: Accessor<boolean>;
  /** The exit hold: the dialog owns the panel's slide out. */
  isExiting: Accessor<boolean>;
  /** The host presented the dialog (`onOpen`); nothing is visible before this. */
  isPresented: Accessor<boolean>;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

export const DrawerContext = context<DrawerContextValue | null>(null);

export function createDrawerContextValue(options: {
  isOpen: Accessor<boolean>;
  setOpen: (open: boolean | ((previous: boolean) => boolean)) => void;
  placement?: Accessor<DrawerPlacement | undefined>;
  variant?: Accessor<DrawerVariants["variant"] | undefined>;
}): DrawerContextValue {
  const placement = () => options.placement?.() ?? "bottom";
  const variant = () => options.variant?.() ?? "opaque";
  const isDismissable = () => true;
  const value: DrawerContextValue = {
    slots: computed(() => drawerVariants({ placement: placement(), variant: variant() })),
    placement,
    variant,
    isDismissable,
    isOpen: options.isOpen,
    isEntering: () => false,
    isExiting: () => false,
    isPresented: () => false,
    open: () => options.setOpen(true),
    close: () => options.setOpen(false),
    toggle: () => options.setOpen((previous) => !previous),
  };
  return value;
}
