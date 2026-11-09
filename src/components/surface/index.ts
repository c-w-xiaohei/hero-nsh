import { SurfaceRoot } from "./surface";
import type { SurfaceRootProps } from "./surface";

/* -------------------------------------------------------------------------------------------------
 * Compound Component
 * -----------------------------------------------------------------------------------------------*/
/**
 * `Surface` is a single-part compound: the root is the whole component, as in
 * HeroUI 3.2.7, and `Surface.Root` names the same component.
 */
export const Surface = Object.assign(SurfaceRoot, {
  Root: SurfaceRoot,
});

export type Surface = {
  Props: SurfaceRootProps;
  RootProps: SurfaceRootProps;
};

/* -------------------------------------------------------------------------------------------------
 * Named Component
 * -----------------------------------------------------------------------------------------------*/
export { SurfaceRoot };

export type { SurfaceRootProps, SurfaceRootProps as SurfaceProps } from "./surface";

/* -------------------------------------------------------------------------------------------------
 * Context
 * -----------------------------------------------------------------------------------------------*/
export { SurfaceContext, type SurfaceContextValue } from "./surface-context";

/* -------------------------------------------------------------------------------------------------
 * Variants
 * -----------------------------------------------------------------------------------------------*/
export { surfaceVariants } from "./surface.styles";

export type { SurfaceVariants } from "./surface.styles";
