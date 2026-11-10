import { SearchFieldClearButton } from "./search-field-clear-button";
import type { SearchFieldClearButtonProps } from "./search-field-clear-button";
import { SearchFieldGroup } from "./search-field-group";
import type { SearchFieldGroupProps } from "./search-field-group";
import { SearchFieldInput } from "./search-field-input";
import type { SearchFieldInputProps } from "./search-field-input";
import { SearchFieldRoot } from "./search-field-root";
import type { SearchFieldRootProps } from "./search-field-root";
import { SearchFieldSearchIcon } from "./search-field-search-icon";
import type { SearchFieldSearchIconProps } from "./search-field-search-icon";

/* -------------------------------------------------------------------------------------------------
 * Compound Component
 * -----------------------------------------------------------------------------------------------*/
/**
 * `SearchField` is HeroUI 3.2.7's five-part compound: a field root that owns
 * the value and the validation, a group that holds the row's look, the input,
 * and the leading icon and trailing clear button.
 */
export const SearchField = Object.assign(SearchFieldRoot, {
  Root: SearchFieldRoot,
  Group: SearchFieldGroup,
  Input: SearchFieldInput,
  SearchIcon: SearchFieldSearchIcon,
  ClearButton: SearchFieldClearButton,
});

export type SearchField = {
  Props: SearchFieldRootProps;
  RootProps: SearchFieldRootProps;
  GroupProps: SearchFieldGroupProps;
  InputProps: SearchFieldInputProps;
  SearchIconProps: SearchFieldSearchIconProps;
  ClearButtonProps: SearchFieldClearButtonProps;
};

/* -------------------------------------------------------------------------------------------------
 * Named Component
 * -----------------------------------------------------------------------------------------------*/
export {
  SearchFieldClearButton,
  SearchFieldGroup,
  SearchFieldInput,
  SearchFieldRoot,
  SearchFieldSearchIcon,
};

export type {
  SearchFieldRootProps,
  SearchFieldRootProps as SearchFieldProps,
} from "./search-field-root";

export type {
  SearchFieldClassNameRenderProps,
  SearchFieldInputType,
  SearchFieldRenderProps,
  SearchFieldState,
  SearchFieldStyleRenderProps,
  SearchFieldValidate,
  SearchFieldValidationError,
} from "./search-field-root";

export type { SearchFieldGroupProps } from "./search-field-group";
export type {
  SearchFieldGroupClassNameRenderProps,
  SearchFieldGroupRenderProps,
  SearchFieldGroupStyleRenderProps,
} from "./search-field-group";

export type { SearchFieldInputProps } from "./search-field-input";
export type {
  SearchFieldInputClassNameRenderProps,
  SearchFieldInputRenderProps,
  SearchFieldInputStyleRenderProps,
} from "./search-field-input";

export type { SearchFieldSearchIconProps } from "./search-field-search-icon";
export type { SearchFieldClearButtonProps } from "./search-field-clear-button";

export type {
  SearchFieldEnterKeyHint,
  SearchFieldInputMode,
  SearchFieldResolvedVariant,
} from "./search-field-context";

/* -------------------------------------------------------------------------------------------------
 * Variants
 * -----------------------------------------------------------------------------------------------*/
export { searchFieldVariants } from "./search-field.styles";

export type { SearchFieldVariants } from "./search-field.styles";
