import { AlertDialogBackdrop, type AlertDialogBackdropProps } from "./alert-dialog-backdrop";
import { AlertDialogBody, type AlertDialogBodyProps } from "./alert-dialog-body";
import {
  AlertDialogCloseTrigger,
  type AlertDialogCloseTriggerProps,
} from "./alert-dialog-close-trigger";
import { AlertDialogContainer, type AlertDialogContainerProps } from "./alert-dialog-container";
import { AlertDialogDialog, type AlertDialogDialogProps } from "./alert-dialog-dialog";
import { AlertDialogFooter, type AlertDialogFooterProps } from "./alert-dialog-footer";
import { AlertDialogHeader, type AlertDialogHeaderProps } from "./alert-dialog-header";
import { AlertDialogHeading, type AlertDialogHeadingProps } from "./alert-dialog-heading";
import { AlertDialogIcon, type AlertDialogIconProps } from "./alert-dialog-icon";
import { AlertDialogRoot, type AlertDialogRootProps } from "./alert-dialog-root";
import { AlertDialogTrigger, type AlertDialogTriggerProps } from "./alert-dialog-trigger";

/* -------------------------------------------------------------------------------------------------
 * Compound component
 * -----------------------------------------------------------------------------------------------*/
/**
 * `AlertDialog` is HeroUI's compound: the root (`DialogTrigger`) plus the ten
 * parts, each of which is also exported by name and reachable as
 * `AlertDialog.Part`. The eleven parts are real components: each renders its
 * own view, reads the context and can be placed where HeroUI allows it.
 */
export const AlertDialog = Object.assign(AlertDialogRoot, {
  Root: AlertDialogRoot,
  Trigger: AlertDialogTrigger,
  Backdrop: AlertDialogBackdrop,
  Container: AlertDialogContainer,
  Dialog: AlertDialogDialog,
  Header: AlertDialogHeader,
  Icon: AlertDialogIcon,
  Heading: AlertDialogHeading,
  Body: AlertDialogBody,
  Footer: AlertDialogFooter,
  CloseTrigger: AlertDialogCloseTrigger,
});

export type AlertDialog = {
  Props: AlertDialogRootProps;
  RootProps: AlertDialogRootProps;
  TriggerProps: AlertDialogTriggerProps;
  BackdropProps: AlertDialogBackdropProps;
  ContainerProps: AlertDialogContainerProps;
  DialogProps: AlertDialogDialogProps;
  HeaderProps: AlertDialogHeaderProps;
  IconProps: AlertDialogIconProps;
  HeadingProps: AlertDialogHeadingProps;
  BodyProps: AlertDialogBodyProps;
  FooterProps: AlertDialogFooterProps;
  CloseTriggerProps: AlertDialogCloseTriggerProps;
};

/* -------------------------------------------------------------------------------------------------
 * Named components and their props
 * -----------------------------------------------------------------------------------------------*/
export {
  AlertDialogBackdrop,
  AlertDialogBody,
  AlertDialogCloseTrigger,
  AlertDialogContainer,
  AlertDialogDialog,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogHeading,
  AlertDialogIcon,
  AlertDialogRoot,
  AlertDialogTrigger,
};

export type {
  AlertDialogBackdropProps,
  AlertDialogBodyProps,
  AlertDialogCloseTriggerProps,
  AlertDialogContainerProps,
  AlertDialogDialogProps,
  AlertDialogFooterProps,
  AlertDialogHeaderProps,
  AlertDialogHeadingProps,
  AlertDialogIconProps,
  AlertDialogRootProps,
  AlertDialogRootProps as AlertDialogProps,
  AlertDialogTriggerProps,
};

/* -------------------------------------------------------------------------------------------------
 * Render values and the open state the parts' render props name
 * -----------------------------------------------------------------------------------------------*/
export type {
  AlertDialogRenderState,
  AlertDialogRenderValues,
} from "./alert-dialog-render-values";

/* -------------------------------------------------------------------------------------------------
 * Variants
 * -----------------------------------------------------------------------------------------------*/
export { alertDialogVariants } from "./alert-dialog.styles";

export type {
  AlertDialogPlacement,
  AlertDialogSize,
  AlertDialogSlots,
  AlertDialogStatus,
  AlertDialogVariant,
} from "./alert-dialog.styles";
