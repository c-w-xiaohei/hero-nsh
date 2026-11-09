import { SpinnerRoot } from "./spinner";
import type { SpinnerRootProps } from "./spinner";

/* -------------------------------------------------------------------------------------------------
 * Compound Component
 * -----------------------------------------------------------------------------------------------*/
/**
 * `Spinner` is a single-part compound: the root is the whole component, as in
 * HeroUI 3.2.7, and `Spinner.Root` names the same component.
 */
export const Spinner = Object.assign(SpinnerRoot, {
  Root: SpinnerRoot,
});

export type Spinner = {
  Props: SpinnerRootProps;
  RootProps: SpinnerRootProps;
};

/* -------------------------------------------------------------------------------------------------
 * Named Component
 * -----------------------------------------------------------------------------------------------*/
export { SpinnerRoot };

export type { SpinnerRootProps, SpinnerRootProps as SpinnerProps } from "./spinner";

/* -------------------------------------------------------------------------------------------------
 * Variants
 * -----------------------------------------------------------------------------------------------*/
export { spinnerVariants } from "./spinner.styles";

export type { SpinnerVariants } from "./spinner.styles";
