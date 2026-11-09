import { SkeletonRoot } from "./skeleton";
import type { SkeletonRootProps } from "./skeleton";

/* -------------------------------------------------------------------------------------------------
 * Compound Component
 * -----------------------------------------------------------------------------------------------*/
/**
 * `Skeleton` is a single-part compound: the root is the whole component, as in
 * HeroUI 3.2.7, and `Skeleton.Root` names the same function.
 */
export const Skeleton = Object.assign(SkeletonRoot, {
  Root: SkeletonRoot,
});

export type Skeleton = {
  Props: SkeletonRootProps;
  RootProps: SkeletonRootProps;
};

/* -------------------------------------------------------------------------------------------------
 * Named Component
 * -----------------------------------------------------------------------------------------------*/
export { SkeletonRoot };

export type { SkeletonRootProps, SkeletonRootProps as SkeletonProps } from "./skeleton";

/* -------------------------------------------------------------------------------------------------
 * Variants
 * -----------------------------------------------------------------------------------------------*/
export { skeletonVariants } from "./skeleton.styles";

export type { SkeletonVariants } from "./skeleton.styles";
