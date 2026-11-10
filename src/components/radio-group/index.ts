import { RadioGroupRoot } from "./radio-group";
import type { RadioGroupRootProps } from "./radio-group";

/* -------------------------------------------------------------------------------------------------
 * Compound Component
 * -----------------------------------------------------------------------------------------------*/

/**
 * `RadioGroup` is a single-part compound upstream: the root is the whole
 * component, and `RadioGroup.Root` names the same implementation. The items it
 * governs are the `Radio` parts, which read this group's context.
 */
export const RadioGroup = Object.assign(RadioGroupRoot, {
  Root: RadioGroupRoot,
});

export type RadioGroup = {
  Props: RadioGroupRootProps;
  RootProps: RadioGroupRootProps;
};

/* -------------------------------------------------------------------------------------------------
 * Named Component
 * -----------------------------------------------------------------------------------------------*/
export { RadioGroupRoot };

export type {
  RadioGroupRootProps,
  RadioGroupRootProps as RadioGroupProps,
} from "./radio-group";

export type { RadioGroupRenderProps } from "../radio/radio-context";

/* -------------------------------------------------------------------------------------------------
 * Variants
 * -----------------------------------------------------------------------------------------------*/
export { radioGroupVariants } from "./radio-group.styles";

export type {
  RadioGroupOrientation,
  RadioGroupVariant,
  RadioGroupVariants,
} from "./radio-group.styles";
