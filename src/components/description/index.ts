import { DescriptionRoot } from "./description";
import type { DescriptionRootProps } from "./description";

/* -------------------------------------------------------------------------------------------------
 * Compound Component
 * -----------------------------------------------------------------------------------------------*/
/**
 * `Description` is a single-part compound: the root is the whole component,
 * as in HeroUI 3.2.7, and `Description.Root` names the same component.
 */
export const Description = Object.assign(DescriptionRoot, {
  Root: DescriptionRoot,
});

export type Description = {
  Props: DescriptionRootProps;
  RootProps: DescriptionRootProps;
};

/* -------------------------------------------------------------------------------------------------
 * Named Component
 * -----------------------------------------------------------------------------------------------*/
export { DescriptionRoot };

export type { DescriptionRootProps, DescriptionRootProps as DescriptionProps } from "./description";

/* -------------------------------------------------------------------------------------------------
 * Variants
 * -----------------------------------------------------------------------------------------------*/
export { descriptionVariants } from "./description.styles";

export type { DescriptionVariants } from "./description.styles";
