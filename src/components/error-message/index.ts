import { ErrorMessageRoot } from "./error-message";
import type { ErrorMessageRootProps } from "./error-message";

/* -------------------------------------------------------------------------------------------------
 * Compound Component
 * -----------------------------------------------------------------------------------------------*/
/**
 * `ErrorMessage` is a single-part compound: the root is the whole component,
 * as in HeroUI 3.2.7, and `ErrorMessage.Root` names the same component.
 */
export const ErrorMessage = Object.assign(ErrorMessageRoot, {
  Root: ErrorMessageRoot,
});

export type ErrorMessage = {
  Props: ErrorMessageRootProps;
  RootProps: ErrorMessageRootProps;
};

/* -------------------------------------------------------------------------------------------------
 * Named Component
 * -----------------------------------------------------------------------------------------------*/
export { ErrorMessageRoot };

export type {
  ErrorMessageRootProps,
  ErrorMessageRootProps as ErrorMessageProps,
} from "./error-message";

/* -------------------------------------------------------------------------------------------------
 * Variants
 * -----------------------------------------------------------------------------------------------*/
export { errorMessageVariants } from "./error-message.styles";

export type { ErrorMessageVariants } from "./error-message.styles";
