import { SkeletonRoot } from "./skeleton";
import type { SkeletonRootProps } from "./skeleton";
import {
  SkeletonGroupItem,
  SkeletonGroupRoot,
  type SkeletonGroupItemProps,
  type SkeletonGroupRootProps,
} from "./skeleton-group";

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

/**
 * `SkeletonGroup` is `Object.assign(SkeletonGroupRoot, { Root, Item })`
 * (sheet A-012): the shared-defaults provider and the item that inherits
 * them (`skeleton-group.tsx:88-92`).
 */
export const SkeletonGroup = Object.assign(SkeletonGroupRoot, {
  Root: SkeletonGroupRoot,
  Item: SkeletonGroupItem,
});

export type SkeletonGroup = {
  Props: SkeletonGroupRootProps;
  RootProps: SkeletonGroupRootProps;
  ItemProps: SkeletonGroupItemProps;
};

/* -------------------------------------------------------------------------------------------------
 * Named Component
 * -----------------------------------------------------------------------------------------------*/
export { SkeletonRoot, SkeletonGroupRoot, SkeletonGroupItem };

export type { SkeletonRootProps, SkeletonRootProps as SkeletonProps } from "./skeleton";

export type {
  SkeletonRootAnimation,
  SkeletonShimmerAnimation,
} from "./skeleton";

export type {
  SkeletonGroupRootProps,
  SkeletonGroupRootProps as SkeletonGroupProps,
  SkeletonGroupItemProps,
};

/* -------------------------------------------------------------------------------------------------
 * Context
 * -----------------------------------------------------------------------------------------------*/
export { SkeletonGroupContext } from "./skeleton-group-context";

export type { SkeletonGroupContextValue } from "./skeleton-group-context";

/* -------------------------------------------------------------------------------------------------
 * Variants
 * -----------------------------------------------------------------------------------------------*/
export { skeletonVariants } from "./skeleton.styles";

export type { SkeletonVariants } from "./skeleton.styles";
