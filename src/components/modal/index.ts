import { ModalBackdrop, type ModalBackdropProps } from "./modal-backdrop";
import { ModalBody, type ModalBodyProps } from "./modal-body";
import { ModalCloseTrigger, type ModalCloseTriggerProps } from "./modal-close-trigger";
import { ModalContainer, type ModalContainerProps } from "./modal-container";
import { ModalDialog, type ModalDialogProps } from "./modal-dialog";
import { ModalFooter, type ModalFooterProps } from "./modal-footer";
import { ModalHeader, type ModalHeaderProps } from "./modal-header";
import { ModalHeading, type ModalHeadingProps } from "./modal-heading";
import { ModalIcon, type ModalIconProps } from "./modal-icon";
import { ModalRoot, type ModalRootProps } from "./modal-root";
import { ModalTrigger, type ModalTriggerProps } from "./modal-trigger";

/* -------------------------------------------------------------------------------------------------
 * Compound component
 * -----------------------------------------------------------------------------------------------*/
/**
 * `Modal` is HeroUI's compound: the root (`DialogTrigger`) plus the ten parts,
 * each of which is also exported by name and reachable as `Modal.Part`. The
 * eleven parts are real components: each renders its own view, reads the
 * context and can be placed where HeroUI allows it.
 */
export const Modal = Object.assign(ModalRoot, {
  Root: ModalRoot,
  Trigger: ModalTrigger,
  Backdrop: ModalBackdrop,
  Container: ModalContainer,
  Dialog: ModalDialog,
  Header: ModalHeader,
  Icon: ModalIcon,
  Heading: ModalHeading,
  Body: ModalBody,
  Footer: ModalFooter,
  CloseTrigger: ModalCloseTrigger,
});

export type Modal = {
  Props: ModalRootProps;
  RootProps: ModalRootProps;
  TriggerProps: ModalTriggerProps;
  BackdropProps: ModalBackdropProps;
  ContainerProps: ModalContainerProps;
  DialogProps: ModalDialogProps;
  HeaderProps: ModalHeaderProps;
  IconProps: ModalIconProps;
  HeadingProps: ModalHeadingProps;
  BodyProps: ModalBodyProps;
  FooterProps: ModalFooterProps;
  CloseTriggerProps: ModalCloseTriggerProps;
};

/* -------------------------------------------------------------------------------------------------
 * Named components and their props
 * -----------------------------------------------------------------------------------------------*/
export {
  ModalBackdrop,
  ModalBody,
  ModalCloseTrigger,
  ModalContainer,
  ModalDialog,
  ModalFooter,
  ModalHeader,
  ModalHeading,
  ModalIcon,
  ModalRoot,
  ModalTrigger,
};

export type {
  ModalBackdropProps,
  ModalBodyProps,
  ModalCloseTriggerProps,
  ModalContainerProps,
  ModalDialogProps,
  ModalFooterProps,
  ModalHeaderProps,
  ModalHeadingProps,
  ModalIconProps,
  ModalRootProps,
  ModalRootProps as ModalProps,
  ModalTriggerProps,
};

/* -------------------------------------------------------------------------------------------------
 * Render values and the open state the parts and `state` prop name
 * -----------------------------------------------------------------------------------------------*/
export type { ModalRenderState, ModalRenderValues } from "./modal-render-values";
export type { ModalState } from "./create-modal-state";

/* -------------------------------------------------------------------------------------------------
 * Variants
 * -----------------------------------------------------------------------------------------------*/
export { modalVariants } from "./modal.styles";

export type { ModalVariants } from "./modal.styles";
