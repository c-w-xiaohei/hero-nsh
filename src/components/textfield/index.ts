import { InputRoot } from "./input";
import type { InputRootProps } from "./input";
import { TextAreaRoot } from "./textarea";
import type { TextAreaRootProps } from "./textarea";
import { TextFieldRoot } from "./textfield";
import type { TextFieldRootProps } from "./textfield";

/* -------------------------------------------------------------------------------------------------
 * Compound Components
 * -----------------------------------------------------------------------------------------------*/
/**
 * `TextField` is HeroUI 3.2.7's single-part compound: the root is the whole
 * component, and `TextField.Root` names the same component.
 */
export const TextField = Object.assign(TextFieldRoot, {
  Root: TextFieldRoot,
});

export type TextField = {
  Props: TextFieldRootProps;
  RootProps: TextFieldRootProps;
};

/**
 * `Input` is HeroUI 3.2.7's single-part compound: the root is the whole
 * component, and `Input.Root` names the same component.
 */
export const Input = Object.assign(InputRoot, {
  Root: InputRoot,
});

export type Input = {
  Props: InputRootProps;
  RootProps: InputRootProps;
};

/**
 * `TextArea` is HeroUI 3.2.7's single-part compound: the root is the whole
 * component, and `TextArea.Root` names the same component.
 */
export const TextArea = Object.assign(TextAreaRoot, {
  Root: TextAreaRoot,
});

export type TextArea = {
  Props: TextAreaRootProps;
  RootProps: TextAreaRootProps;
};

/* -------------------------------------------------------------------------------------------------
 * Named Components
 * -----------------------------------------------------------------------------------------------*/
export { TextFieldRoot, InputRoot, TextAreaRoot };

export type {
  TextFieldRootProps,
  TextFieldRootProps as TextFieldProps,
  TextFieldRenderProps,
  TextFieldClassNameRenderProps,
  TextFieldStyleRenderProps,
  TextFieldValidationError,
  TextFieldValidate,
  TextFieldType,
} from "./textfield";
export type { InputRootProps, InputRootProps as InputProps } from "./input";
export type { TextAreaRootProps, TextAreaRootProps as TextAreaProps } from "./textarea";

/* -------------------------------------------------------------------------------------------------
 * Context
 * -----------------------------------------------------------------------------------------------*/
export { TextFieldContext } from "./textfield-context";

export type {
  TextFieldContextValue,
  TextFieldEnterKeyHint,
  TextFieldInputMode,
  TextFieldVariant,
} from "./textfield-context";

/* -------------------------------------------------------------------------------------------------
 * Variants
 * -----------------------------------------------------------------------------------------------*/
export { textFieldVariants } from "./textfield.styles";
export { inputVariants } from "./input.styles";
export { textAreaVariants } from "./textarea.styles";

export type { TextFieldVariants } from "./textfield.styles";
export type { InputVariants } from "./input.styles";
export type { TextAreaVariants } from "./textarea.styles";
