import { SheetBackdrop, type SheetBackdropProps } from "./sheet-backdrop";
import { SheetBody, type SheetBodyProps } from "./sheet-body";
import { SheetClose, type SheetCloseProps } from "./sheet-close";
import { SheetCloseTrigger, type SheetCloseTriggerProps } from "./sheet-close-trigger";
import { SheetContent, type SheetContentProps } from "./sheet-content";
import { SheetDialog, type SheetDialogProps } from "./sheet-dialog";
import { SheetFooter, type SheetFooterProps } from "./sheet-footer";
import { SheetHandle, type SheetHandleProps } from "./sheet-handle";
import { SheetHeader, type SheetHeaderProps } from "./sheet-header";
import { SheetHeading, type SheetHeadingProps } from "./sheet-heading";
import { SheetNestedRoot, type SheetNestedRootProps } from "./sheet-nested-root";
import { SheetRoot, type SheetRootProps } from "./sheet-root";
import { SheetTrigger, type SheetTriggerProps } from "./sheet-trigger";

/* -------------------------------------------------------------------------------------------------
 * Compound component
 * -----------------------------------------------------------------------------------------------*/
/**
 * `Sheet` is HeroUI's compound: the root plus the twelve parts, each also
 * exported by name and reachable as `Sheet.Part`. Every part is a real
 * component: each reads the context and can be placed where HeroUI allows it.
 *
 * `Sheet.Close` and `Sheet.NestedRoot` are the two HeroUI fixtures forget;
 * they are here (port sheet §1).
 */
export const Sheet = Object.assign(SheetRoot, {
  Backdrop: SheetBackdrop,
  Body: SheetBody,
  Close: SheetClose,
  CloseTrigger: SheetCloseTrigger,
  Content: SheetContent,
  Dialog: SheetDialog,
  Footer: SheetFooter,
  Handle: SheetHandle,
  Header: SheetHeader,
  Heading: SheetHeading,
  NestedRoot: SheetNestedRoot,
  Root: SheetRoot,
  Trigger: SheetTrigger,
});

export type Sheet = {
  Props: SheetRootProps;
  RootProps: SheetRootProps;
  NestedRootProps: SheetNestedRootProps;
  TriggerProps: SheetTriggerProps;
  CloseProps: SheetCloseProps;
  BackdropProps: SheetBackdropProps;
  ContentProps: SheetContentProps;
  DialogProps: SheetDialogProps;
  HeaderProps: SheetHeaderProps;
  HeadingProps: SheetHeadingProps;
  BodyProps: SheetBodyProps;
  FooterProps: SheetFooterProps;
  HandleProps: SheetHandleProps;
  CloseTriggerProps: SheetCloseTriggerProps;
};

/* -------------------------------------------------------------------------------------------------
 * Named components and their props
 * -----------------------------------------------------------------------------------------------*/
export {
  SheetBackdrop,
  SheetBody,
  SheetClose,
  SheetCloseTrigger,
  SheetContent,
  SheetDialog,
  SheetFooter,
  SheetHandle,
  SheetHeader,
  SheetHeading,
  SheetNestedRoot,
  SheetRoot,
  SheetTrigger,
};

export type {
  SheetBackdropProps,
  SheetBodyProps,
  SheetCloseProps,
  SheetCloseTriggerProps,
  SheetContentProps,
  SheetDialogProps,
  SheetFooterProps,
  SheetHandleProps,
  SheetHeaderProps,
  SheetHeadingProps,
  SheetNestedRootProps,
  SheetRootProps,
  SheetRootProps as SheetProps,
  SheetTriggerProps,
};

/* -------------------------------------------------------------------------------------------------
 * Render values and the state the parts share
 * -----------------------------------------------------------------------------------------------*/
export type { SheetRenderValues } from "./sheet-render-values";
export type { SheetDetentState } from "./create-sheet-detent";
export type { SheetSwipeDirection, SheetPlacement, SheetVariants } from "./sheet.styles";

/* -------------------------------------------------------------------------------------------------
 * Variants
 * -----------------------------------------------------------------------------------------------*/
export { sheetVariants } from "./sheet.styles";
