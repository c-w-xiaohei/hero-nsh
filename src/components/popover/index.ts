import { PopoverArrow, type PopoverArrowProps } from "./popover-arrow";
import { PopoverContent, type PopoverContentProps } from "./popover-content";
import { PopoverDialog, type PopoverDialogProps } from "./popover-dialog";
import { PopoverHeading, type PopoverHeadingProps } from "./popover-heading";
import { PopoverRoot, type PopoverRootProps } from "./popover-root";
import { PopoverTrigger, type PopoverTriggerProps } from "./popover-trigger";

/* -------------------------------------------------------------------------------------------------
 * Compound component
 * -----------------------------------------------------------------------------------------------*/
/**
 * `Popover` is HeroUI's compound: the root plus the six parts, each of which is
 * also exported by name and reachable as `Popover.Part`.
 */
export const Popover = Object.assign(PopoverRoot, {
  Root: PopoverRoot,
  Trigger: PopoverTrigger,
  Dialog: PopoverDialog,
  Arrow: PopoverArrow,
  Content: PopoverContent,
  Heading: PopoverHeading,
});

export type Popover = {
  Props: PopoverRootProps;
  RootProps: PopoverRootProps;
  TriggerProps: PopoverTriggerProps;
  DialogProps: PopoverDialogProps;
  ArrowProps: PopoverArrowProps;
  ContentProps: PopoverContentProps;
  HeadingProps: PopoverHeadingProps;
};

/* -------------------------------------------------------------------------------------------------
 * Named components and their props
 * -----------------------------------------------------------------------------------------------*/
export {
  PopoverArrow,
  PopoverContent,
  PopoverDialog,
  PopoverHeading,
  PopoverRoot,
  PopoverTrigger,
};

export type {
  PopoverArrowProps,
  PopoverContentProps,
  PopoverDialogProps,
  PopoverHeadingProps,
  PopoverRootProps,
  PopoverRootProps as PopoverProps,
  PopoverTriggerProps,
};

/* -------------------------------------------------------------------------------------------------
 * Render values and placement, the parts of the public surface code may name
 * -----------------------------------------------------------------------------------------------*/
export type {
  PopoverArrowRenderValues,
} from "./popover-arrow";
export type { PopoverRenderValues } from "./popover-content";
export type { PopoverDialogRenderValues } from "./popover-dialog";
export type { PopoverPlacement } from "./popover-placement";

/* -------------------------------------------------------------------------------------------------
 * Variants
 * -----------------------------------------------------------------------------------------------*/
export { popoverVariants } from "./popover.styles";

export type { PopoverVariants } from "./popover.styles";
