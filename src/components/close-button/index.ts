import { CloseButtonRoot } from "./close-button-root";
import type { CloseButtonRenderProps, CloseButtonRootProps } from "./close-button-root";

/* -------------------------------------------------------------------------------------------------
 * Compound Component
 * -----------------------------------------------------------------------------------------------*/
/**
 * `CloseButton` is a single-root compound as in HeroUI 3.2.7: the root is the
 * whole component and also reachable as `CloseButton.Root`, with the same
 * function. HeroUI's only other piece, the default `CloseIcon`, is internal
 * JSX and is not exported there either (port sheet §1.1).
 */
export const CloseButton = Object.assign(CloseButtonRoot, {
  Root: CloseButtonRoot,
});

export type CloseButton = {
  Props: CloseButtonRootProps;
  RootProps: CloseButtonRootProps;
};

/* -------------------------------------------------------------------------------------------------
 * Named Component
 * -----------------------------------------------------------------------------------------------*/
export { CloseButtonRoot };

export type {
  CloseButtonRenderProps,
  CloseButtonRootProps,
  CloseButtonRootProps as CloseButtonProps,
};

/* -------------------------------------------------------------------------------------------------
 * Variants
 * -----------------------------------------------------------------------------------------------*/
export { closeButtonVariants } from "./close-button.styles";

export type { CloseButtonVariants } from "./close-button.styles";
