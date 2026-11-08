import { LabelRoot } from "./label";
import type { LabelRootProps } from "./label";

/* -------------------------------------------------------------------------------------------------
 * Compound Component
 * -----------------------------------------------------------------------------------------------*/
/**
 * `Label` is a single-part compound: the root is the whole component, as in
 * HeroUI 3.2.7, and `Label.Root` names the same component.
 */
export const Label = Object.assign(LabelRoot, {
  Root: LabelRoot,
});

export type Label = {
  Props: LabelRootProps;
  RootProps: LabelRootProps;
};

/* -------------------------------------------------------------------------------------------------
 * Named Component
 * -----------------------------------------------------------------------------------------------*/
export { LabelRoot };

export type { LabelRootProps, LabelRootProps as LabelProps } from "./label";

/* -------------------------------------------------------------------------------------------------
 * Variants
 * -----------------------------------------------------------------------------------------------*/
export { labelVariants } from "./label.styles";

export type { LabelVariants } from "./label.styles";
