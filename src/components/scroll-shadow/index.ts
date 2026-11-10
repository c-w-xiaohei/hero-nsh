import { ScrollShadowRoot } from "./scroll-shadow";
import type { ScrollShadowRootProps } from "./scroll-shadow";

/* -------------------------------------------------------------------------------------------------
 * Compound component
 * -----------------------------------------------------------------------------------------------*/
/**
 * `ScrollShadow` is a single-part compound: the root is the whole component, as
 * in HeroUI 3.2.7, and `ScrollShadow.Root` names the same component.
 */
export const ScrollShadow = Object.assign(ScrollShadowRoot, {
  Root: ScrollShadowRoot,
});

export type ScrollShadow = {
  Props: ScrollShadowRootProps;
  RootProps: ScrollShadowRootProps;
};

/* -------------------------------------------------------------------------------------------------
 * Named component
 * -----------------------------------------------------------------------------------------------*/
export { ScrollShadowRoot };

export type {
  ScrollShadowRootProps,
  ScrollShadowRootProps as ScrollShadowProps,
  ScrollShadowVisibility,
} from "./scroll-shadow";

/* -------------------------------------------------------------------------------------------------
 * Variants
 * -----------------------------------------------------------------------------------------------*/
export { scrollShadowVariants } from "./scroll-shadow.styles";

export type { ScrollShadowVariants } from "./scroll-shadow.styles";
