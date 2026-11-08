import { FieldErrorRoot } from "./field-error";
import type { FieldErrorRootProps } from "./field-error";

/* -------------------------------------------------------------------------------------------------
 * Compound Component
 * -----------------------------------------------------------------------------------------------*/
/**
 * `FieldError` is a single-part compound: the root is the whole component, as
 * in HeroUI 3.2.7, and `FieldError.Root` names the same component.
 */
export const FieldError = Object.assign(FieldErrorRoot, {
  Root: FieldErrorRoot,
});

export type FieldError = {
  Props: FieldErrorRootProps;
  RootProps: FieldErrorRootProps;
};

/* -------------------------------------------------------------------------------------------------
 * Named Component
 * -----------------------------------------------------------------------------------------------*/
export { FieldErrorRoot };

export type {
  FieldErrorRootProps,
  FieldErrorRootProps as FieldErrorProps,
} from "./field-error";

/* -------------------------------------------------------------------------------------------------
 * Variants
 * -----------------------------------------------------------------------------------------------*/
export { fieldErrorVariants } from "./field-error.styles";

export type { FieldErrorVariants } from "./field-error.styles";

/* -------------------------------------------------------------------------------------------------
 * Render props
 * -----------------------------------------------------------------------------------------------*/
export type {
  FieldErrorRenderProp,
  FieldErrorRenderProps,
} from "./field-error";
