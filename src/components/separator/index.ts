import { SeparatorRoot } from "./separator";
import type { SeparatorRootProps } from "./separator";

/* -------------------------------------------------------------------------------------------------
 * Compound Component
 * -----------------------------------------------------------------------------------------------*/
/**
 * `Separator` is a single-part compound: the root is the whole component, as
 * in HeroUI 3.2.7, and `Separator.Root` names the same component.
 */
export const Separator = Object.assign(SeparatorRoot, {
  Root: SeparatorRoot,
});

export type Separator = {
  Props: SeparatorRootProps;
  RootProps: SeparatorRootProps;
};

/* -------------------------------------------------------------------------------------------------
 * Named Component
 * -----------------------------------------------------------------------------------------------*/
export { SeparatorRoot };

export type { SeparatorRootProps, SeparatorRootProps as SeparatorProps } from "./separator";

/* -------------------------------------------------------------------------------------------------
 * Variants
 * -----------------------------------------------------------------------------------------------*/
export { separatorVariants } from "./separator.styles";

export type { SeparatorVariants } from "./separator.styles";
