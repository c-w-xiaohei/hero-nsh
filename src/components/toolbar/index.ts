import { ToolbarRoot } from "./toolbar";
import type { ToolbarRootProps } from "./toolbar";

/* -------------------------------------------------------------------------------------------------
 * Compound Component
 * -----------------------------------------------------------------------------------------------*/
/**
 * `Toolbar` is a single-part compound: the root is the whole component, as in
 * HeroUI 3.2.7, and `Toolbar.Root` names the same component.
 */
export const Toolbar = Object.assign(ToolbarRoot, {
  Root: ToolbarRoot,
});

export type Toolbar = {
  Props: ToolbarRootProps;
  RootProps: ToolbarRootProps;
};

/* -------------------------------------------------------------------------------------------------
 * Named Component
 * -----------------------------------------------------------------------------------------------*/
export { ToolbarRoot };

export type { ToolbarRootProps, ToolbarRootProps as ToolbarProps } from "./toolbar";
export type { ToolbarRenderProps } from "./toolbar";

/* -------------------------------------------------------------------------------------------------
 * Variants
 * -----------------------------------------------------------------------------------------------*/
export { toolbarVariants } from "./toolbar.styles";

export type { ToolbarVariants, ToolbarOrientation } from "./toolbar.styles";
