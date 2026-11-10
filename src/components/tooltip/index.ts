import { TooltipArrow, type TooltipArrowProps } from "./tooltip-arrow";
import { TooltipContent, type TooltipContentProps } from "./tooltip-content";
import { TooltipRoot, type TooltipRootProps } from "./tooltip-root";
import { TooltipTrigger, type TooltipTriggerProps } from "./tooltip-trigger";

/* -------------------------------------------------------------------------------------------------
 * Compound component
 * -----------------------------------------------------------------------------------------------*/
/**
 * `Tooltip` is HeroUI's compound: the root plus the four parts, each of which
 * is also exported by name and reachable as `Tooltip.Part`.
 */
export const Tooltip = Object.assign(TooltipRoot, {
  Root: TooltipRoot,
  Trigger: TooltipTrigger,
  Content: TooltipContent,
  Arrow: TooltipArrow,
});

export type Tooltip = {
  Props: TooltipRootProps;
  RootProps: TooltipRootProps;
  TriggerProps: TooltipTriggerProps;
  ContentProps: TooltipContentProps;
  ArrowProps: TooltipArrowProps;
};

/* -------------------------------------------------------------------------------------------------
 * Named components and their props
 * -----------------------------------------------------------------------------------------------*/
export { TooltipArrow, TooltipContent, TooltipRoot, TooltipTrigger };

export type {
  TooltipArrowProps,
  TooltipContentProps,
  TooltipRootProps,
  TooltipRootProps as TooltipProps,
  TooltipTriggerProps,
};

/* -------------------------------------------------------------------------------------------------
 * Render values, state and placement, the parts of the public surface code may
 * name
 * -----------------------------------------------------------------------------------------------*/
export type { TooltipArrowRenderValues } from "./tooltip-arrow";
export type { TooltipRenderValues } from "./tooltip-content";
export type { TooltipState } from "./tooltip-context";
export type { TooltipPlacement, TooltipSide } from "./tooltip-placement";

/* -------------------------------------------------------------------------------------------------
 * Variants
 * -----------------------------------------------------------------------------------------------*/
export { tooltipVariants } from "./tooltip.styles";

export type { TooltipVariants } from "./tooltip.styles";
