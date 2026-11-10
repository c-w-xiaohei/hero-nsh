import {
  DateInputGroupInput,
  type DateInputGroupInputContainerProps,
  DateInputGroupInputContainer,
  type DateInputGroupInputProps,
  DateInputGroupPrefix,
  type DateInputGroupPrefixProps,
  DateInputGroupRoot,
  type DateInputGroupRootProps,
  DateInputGroupSegment,
  type DateInputGroupSegmentProps,
  DateInputGroupSuffix,
  type DateInputGroupSuffixProps,
} from "../date-input-group";
import { DateFieldRoot } from "./date-field-root";
import type { DateFieldRenderProps, DateFieldRootProps } from "./date-field-root";

/* -------------------------------------------------------------------------------------------------
 * Compound Component
 * -----------------------------------------------------------------------------------------------*/
/**
 * `DateField` is HeroUI 3.2.7's date input: a root that bridges the public
 * `DateValue` to the field state, and the six `date-input-group` parts bound by
 * identity, exactly as upstream's `index.ts:17-25` does. Every part is a real
 * component, usable as `DateField.Group` and as `DateInputGroupRoot`.
 */
export const DateField = Object.assign(DateFieldRoot, {
  Root: DateFieldRoot,
  Group: DateInputGroupRoot,
  Input: DateInputGroupInput,
  InputContainer: DateInputGroupInputContainer,
  Segment: DateInputGroupSegment,
  Prefix: DateInputGroupPrefix,
  Suffix: DateInputGroupSuffix,
});

export type DateField = {
  Props: DateFieldRootProps;
  RootProps: DateFieldRootProps;
  GroupProps: DateInputGroupRootProps;
  InputProps: DateInputGroupInputProps;
  InputContainerProps: DateInputGroupInputContainerProps;
  SegmentProps: DateInputGroupSegmentProps;
  PrefixProps: DateInputGroupPrefixProps;
  SuffixProps: DateInputGroupSuffixProps;
};

/* -------------------------------------------------------------------------------------------------
 * Named Component
 * -----------------------------------------------------------------------------------------------*/
export { DateFieldRoot };

export type { DateFieldRootProps, DateFieldRootProps as DateFieldProps };

/* -------------------------------------------------------------------------------------------------
 * Render props and field state
 * -----------------------------------------------------------------------------------------------*/
export type { DateFieldRenderProps };
export type { DateFieldState } from "../date-input-group/create-date-field-state";

/* -------------------------------------------------------------------------------------------------
 * Variants
 * -----------------------------------------------------------------------------------------------*/
export { dateFieldVariants } from "./date-field.styles";

export type { DateFieldVariants } from "./date-field.styles";
