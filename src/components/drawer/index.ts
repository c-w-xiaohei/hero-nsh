import { DrawerBackdrop, type DrawerBackdropProps } from "./drawer-backdrop";
import { DrawerBody, type DrawerBodyProps } from "./drawer-body";
import { DrawerCloseTrigger, type DrawerCloseTriggerProps } from "./drawer-close-trigger";
import { DrawerContent, type DrawerContentProps } from "./drawer-content";
import { DrawerDialog, type DrawerDialogProps } from "./drawer-dialog";
import { DrawerFooter, type DrawerFooterProps } from "./drawer-footer";
import { DrawerHandle, type DrawerHandleProps } from "./drawer-handle";
import { DrawerHeader, type DrawerHeaderProps } from "./drawer-header";
import { DrawerHeading, type DrawerHeadingProps } from "./drawer-heading";
import { DrawerRoot, type DrawerRootProps } from "./drawer-root";
import { DrawerTrigger, type DrawerTriggerProps } from "./drawer-trigger";

export const Drawer = Object.assign(DrawerRoot, {
  Root: DrawerRoot, Trigger: DrawerTrigger, Backdrop: DrawerBackdrop, Content: DrawerContent,
  Dialog: DrawerDialog, Header: DrawerHeader, Heading: DrawerHeading, Body: DrawerBody,
  Footer: DrawerFooter, Handle: DrawerHandle, CloseTrigger: DrawerCloseTrigger,
});

export type Drawer = {
  Props: DrawerRootProps; RootProps: DrawerRootProps; TriggerProps: DrawerTriggerProps;
  BackdropProps: DrawerBackdropProps; ContentProps: DrawerContentProps; DialogProps: DrawerDialogProps;
  HeaderProps: DrawerHeaderProps; HeadingProps: DrawerHeadingProps; BodyProps: DrawerBodyProps;
  FooterProps: DrawerFooterProps; HandleProps: DrawerHandleProps; CloseTriggerProps: DrawerCloseTriggerProps;
};

export { DrawerBackdrop, DrawerBody, DrawerCloseTrigger, DrawerContent, DrawerDialog, DrawerFooter, DrawerHandle, DrawerHeader, DrawerHeading, DrawerRoot, DrawerTrigger };
export type { DrawerState } from "./create-drawer-state";
export { drawerVariants } from "./drawer.styles";
export type { DrawerPlacement, DrawerSlots, DrawerVariants } from "./drawer.styles";
