import { FormRoot } from "./form";
import type { FormRootProps } from "./form";

/* -------------------------------------------------------------------------------------------------
 * Compound Component
 * -----------------------------------------------------------------------------------------------*/
/**
 * `Form` is a single-part compound as in HeroUI 3.2.7: the root is the whole
 * component and `Form.Root` names the same component.
 */
export const Form = Object.assign(FormRoot, {
  Root: FormRoot,
});

export type Form = {
  Props: FormRootProps;
  RootProps: FormRootProps;
};

/* -------------------------------------------------------------------------------------------------
 * Named Component
 * -----------------------------------------------------------------------------------------------*/
export { FormRoot };

export type { FormRootProps, FormRootProps as FormProps } from "./form";

/* -------------------------------------------------------------------------------------------------
 * Submit event
 * -----------------------------------------------------------------------------------------------*/
export type { FormSubmitEvent } from "./form";

/* -------------------------------------------------------------------------------------------------
 * Validation errors
 * -----------------------------------------------------------------------------------------------*/
export type { ValidationErrors } from "./context";
