import { EmptyStateRoot } from "./empty-state";
import type { EmptyStateRootProps } from "./empty-state";

/* -------------------------------------------------------------------------------------------------
 * Compound Component
 * -----------------------------------------------------------------------------------------------*/
/**
 * `EmptyState` is a single-part compound, as in HeroUI 3.2.7: the root is the
 * whole component and `EmptyState.Root` names the same function.
 */
export const EmptyState = Object.assign(EmptyStateRoot, {
  Root: EmptyStateRoot,
});

export type EmptyState = {
  Props: EmptyStateRootProps;
  RootProps: EmptyStateRootProps;
};

/* -------------------------------------------------------------------------------------------------
 * Named Component
 * -----------------------------------------------------------------------------------------------*/
export { EmptyStateRoot };

export type { EmptyStateRootProps, EmptyStateRootProps as EmptyStateProps } from "./empty-state";

/* -------------------------------------------------------------------------------------------------
 * Variants
 * -----------------------------------------------------------------------------------------------*/
export { emptyStateVariants } from "./empty-state.styles";

export type { EmptyStateVariants } from "./empty-state.styles";
