import {
  InputGroupInput,
  type InputGroupInputProps,
} from "./input-group-input";
import { InputGroupPrefix, type InputGroupPrefixProps } from "./input-group-prefix";
import {
  InputGroupRoot,
  type InputGroupHoverEvent,
  type InputGroupRenderProps,
  type InputGroupRootProps,
} from "./input-group-root";
import { InputGroupSuffix, type InputGroupSuffixProps } from "./input-group-suffix";
import { InputGroupTextArea, type InputGroupTextAreaProps } from "./input-group-textarea";

/* -------------------------------------------------------------------------------------------------
 * Compound component
 * -----------------------------------------------------------------------------------------------*/

/**
 * `InputGroup` — HeroUI 3.2.7's group around an input or a textarea and its
 * affixes. `InputGroup.Root === InputGroup`, as upstream's `index.ts:14-20`.
 */
export const InputGroup = Object.assign(InputGroupRoot, {
  Root: InputGroupRoot,
  Input: InputGroupInput,
  TextArea: InputGroupTextArea,
  Prefix: InputGroupPrefix,
  Suffix: InputGroupSuffix,
});

export type InputGroup = {
  Props: InputGroupRootProps;
  RootProps: InputGroupRootProps;
  InputProps: InputGroupInputProps;
  TextAreaProps: InputGroupTextAreaProps;
  PrefixProps: InputGroupPrefixProps;
  SuffixProps: InputGroupSuffixProps;
};

/* -------------------------------------------------------------------------------------------------
 * Named components and their props
 * -----------------------------------------------------------------------------------------------*/

export {
  InputGroupInput,
  InputGroupPrefix,
  InputGroupRoot,
  InputGroupSuffix,
  InputGroupTextArea,
};

export type {
  InputGroupRootProps,
  InputGroupRootProps as InputGroupProps,
  InputGroupInputProps,
  InputGroupTextAreaProps,
  InputGroupPrefixProps,
  InputGroupSuffixProps,
  InputGroupRenderProps,
  InputGroupHoverEvent,
};

/* -------------------------------------------------------------------------------------------------
 * Variants
 * -----------------------------------------------------------------------------------------------*/

export { inputGroupVariants } from "./input-group.styles";

export type { InputGroupVariants, InputGroupVariant } from "./input-group.styles";
